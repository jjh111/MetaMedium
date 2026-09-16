// ===== models =====
// The model pane, and the seats in it (SHARD-3D-PLAN §6).
//
// `Demos/surface/04-models.js` PORTED, not forked — and what it learned is
// what is kept:
//
//   * **Both local servers are probed, in parallel.** Returning on the first
//     that answered hid a running Ollama behind LM Studio.
//   * **Embedding-only models are hidden AND SAID.** An Ollama holding only
//     `nomic-embed-text` used to show nothing and explain nothing.
//   * **The pick is remembered as a PREFERENCE**, honoured when that server
//     still offers that model and quietly ignored otherwise. A remembered
//     pointer at a model that has gone is not an error to report.
//   * **A key is remembered only when asked**, and only on this device — and
//     **no key ever enters the log**: the `join` event carries a kind and a
//     name and nothing else.
//
// The transport is core's (`llm/provider.ts`). A model participant is
// SURFACE-side, exactly as the canvas's `agents[]` are: the session keeps every
// `join` in its history, and leaving only stops a model being asked.

import { listModels, PRESETS, providerLocality, type ProviderConfig } from 'metamedium-core';
import type { SpaceTransport } from './generator';
import { splitPrompt, type Room } from './room';
import { chip, esc, pill, row, sep } from './ui';

/** The seat a hand in the room sits in. One name, so the pane and the e2e agree. */
export const HAND_SEAT = 'Claude Code (MCP hand)';

export interface Seat {
  /** The participant id in the session — what everything it proposes is attributed to. */
  id: string;
  name: string;
  config: ProviderConfig;
  locality: 'local' | 'hosted';
  /** Injected for the stub; absent means core's HTTP transport. */
  transport?: SpaceTransport;
}

export interface Models {
  seats(): Seat[];
  /** The seat a brief goes to: the first, and the only one P5 asks. */
  first(): Seat | null;
  open(): void;
  close(): void;
  isOpen(): boolean;
  toggle(): void;
  /** Probe both local servers and repaint the pane. */
  probe(): Promise<void>;
  /** Seat a model with a transport of its own — the e2e's stub, and the tests'. */
  joinWith(name: string, transport: SpaceTransport, config?: Partial<ProviderConfig>): Seat;
  /**
   * Seat the hand in the room (G5). Everything upstream — `runBrief`, the
   * field's reading line, the work panel, Esc — sees a model, because the seat
   * IS a model: one `transport`, the same `CompletionResult`, the same signal.
   * The only difference is where the question goes.
   */
  joinHand(room: Room): Seat;
  /** The seat the hand sits in, if it is seated. */
  hand(): Seat | null;
  leave(id: string): void;
  onChange(fn: () => void): void;
}

export interface ModelsOptions {
  host: HTMLElement;
  /** Seat a participant in the session and hand back its id. */
  join(name: string, locality: 'local' | 'hosted'): string;
  say(sentence: string): void;
  /**
   * What a brief is about, in this hand's ids — the selected solid, else the
   * selected mark. A parked brief is an answer on the explanation plane, and
   * an answer stands beside what it is about; with nothing selected there is
   * nowhere to park it, and `runBrief` has already refused by then.
   */
  subject?(): string[];
  /** The room, when one has been joined — what `joinHand` needs and the pane reports. */
  room?(): Room | null;
  /** Join a room on demand, so the pane's *in the room* button can. */
  enterRoom?(): Promise<Room | null>;
}

interface Found {
  server: string;
  baseUrl: string;
  models: { name: string; chat: boolean }[];
  skipped: string[];
  error?: string;
}

const PREF = 'shard3d.model';
const KEYS = 'shard3d.keys';

const store = {
  get<T>(k: string): T | null {
    try {
      return JSON.parse(localStorage.getItem(k) || 'null') as T | null;
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* a private window; a preference is not worth an error */
    }
  },
};

/**
 * Both local servers, at once. Ollama lists `vision` among a model's
 * capabilities and LM Studio types a model `vlm`; neither matters to P5, which
 * sends no pixels — but an EMBEDDING model cannot chat, and offering one is
 * offering a seat that will never answer.
 */
export async function probeLocal(): Promise<Found[]> {
  const probes: { server: string; baseUrl: string; native: string; pick: (d: unknown) => { name: string; chat: boolean }[] }[] = [
    {
      server: 'Ollama',
      baseUrl: PRESETS.ollama.baseUrl,
      native: 'http://localhost:11434/api/tags',
      pick: (d) =>
        ((d as { models?: { name?: string; details?: { families?: string[] } }[] }).models ?? []).map((m) => ({
          name: String(m.name),
          chat: !/embed/i.test(String(m.name)),
        })),
    },
    {
      server: 'LM Studio',
      baseUrl: PRESETS.lmStudio.baseUrl,
      native: 'http://localhost:1234/api/v0/models',
      pick: (d) =>
        ((d as { data?: { id?: string; type?: string }[] }).data ?? []).map((m) => ({
          name: String(m.id),
          chat: !/embed/i.test(String(m.id)) && m.type !== 'embeddings',
        })),
    },
  ];

  const settled = await Promise.allSettled(
    probes.map(async (p) => {
      // The native endpoint first, because it says WHAT a model is; the
      // OpenAI-compatible list is the fallback and says only that it is there.
      let models: { name: string; chat: boolean }[] = [];
      let error: string | undefined;
      try {
        const res = await fetch(p.native, { signal: AbortSignal.timeout(4000) });
        if (res.ok) models = p.pick(await res.json());
      } catch {
        /* fall through to the /v1 list */
      }
      if (!models.length) {
        const list = await listModels({ baseUrl: p.baseUrl });
        if (!list.ok) error = list.error;
        models = list.models.map((name) => ({ name, chat: !/embed/i.test(name) }));
      }
      return {
        server: p.server,
        baseUrl: p.baseUrl,
        models: models.filter((m) => m.chat),
        skipped: models.filter((m) => !m.chat).map((m) => m.name),
        ...(error ? { error } : {}),
      } satisfies Found;
    })
  );
  return settled
    .filter((s): s is PromiseFulfilledResult<Found> => s.status === 'fulfilled')
    .map((s) => s.value)
    .filter((f) => f.models.length || f.skipped.length);
}

export function createModels(o: ModelsOptions): Models {
  const seats: Seat[] = [];
  const listeners: (() => void)[] = [];
  let found: Found[] = [];
  let status = '';
  let open = false;
  const changed = () => listeners.forEach((fn) => fn());

  function seat(name: string, config: ProviderConfig, transport?: SpaceTransport): Seat {
    const locality = providerLocality(config);
    const s: Seat = {
      // The join event carries a KIND and a NAME and nothing else — no key, no
      // base URL, no header. The log, the folder and an export are clean of it.
      id: o.join(name, locality),
      name,
      config,
      locality,
      ...(transport ? { transport } : {}),
    };
    seats.push(s);
    changed();
    return s;
  }

  /**
   * The hand's seat: a transport that PARKS the question in the room instead
   * of posting it to a server, and settles when `space_answer` lands.
   *
   * This is `participants/bridge.ts` with the room as the wire, and it is
   * deliberately the whole of the difference. `propose()` sends the same
   * prompts, `parseProposal` reads the same reply, `runBrief` applies it the
   * same way and attributes the version to this seat — so a brief answered by
   * Claude Code in a conversation takes the identical path a small model takes,
   * which is the point of the package: the contract is argued about first hand
   * before anything is tuned against it.
   */
  function joinHand(room: Room): Seat {
    const held = seats.find((s) => s.name === HAND_SEAT);
    if (held) return held;
    const transport: SpaceTransport = async (_config, messages, opts) => {
      const system = messages.filter((m) => m.role === 'system').map((m) => String(m.content)).join('\n\n');
      const user = messages.filter((m) => m.role === 'user').map((m) => String(m.content)).join('\n\n');
      const { brief, words } = splitPrompt(user);
      const out = await room.ask({
        // Everything a model was told, so the hand answers the same question —
        // the contract included. `bridge.ts`'s rule: park the question, do not
        // paraphrase it.
        prompt: `${system}\n\n----\n\n${user}`,
        brief,
        words,
        about: o.subject?.() ?? [],
        ...(opts.signal ? { signal: opts.signal } : {}),
      });
      return out.ok ? { ok: true as const, text: out.text, model: HAND_SEAT } : { ok: false as const, error: out.error };
    };
    const s = seat(
      HAND_SEAT,
      // The relay IS where the brief goes, so it is the seat's base URL — and
      // a relay on this machine reads as `local`, which is true and is what the
      // router's cost model should see. A made-up scheme read as `hosted`.
      { kind: 'openai-compatible', baseUrl: room.relay || 'http://127.0.0.1:8020', model: HAND_SEAT, label: HAND_SEAT },
      transport
    );
    // **The hand takes the front.** `first()` is who a brief goes to, and
    // sitting down in this seat is a deliberate act that says *ask me* — with a
    // local model already seated, a brief typed at the hand would otherwise go
    // to the model, which is the opposite of what was just asked for. *Leave
    // the seat* puts it back.
    seats.splice(seats.indexOf(s), 1);
    seats.unshift(s);
    o.say(
      `${HAND_SEAT} is seated in room “${room.room}” as ${room.label} — a brief waits here until a hand answers it; nothing is posted anywhere`
    );
    return s;
  }

  function joinLocal(server: Found, model: string) {
    if (seats.some((s) => s.name === model)) return;
    seat(model, { kind: 'openai-compatible', baseUrl: server.baseUrl, model, label: model });
    store.set(PREF, { server: server.server, model });
    o.say(`${model} joined from ${server.server} · tier 2 · local — it is asked only when you press Enter on a brief`);
    render();
  }

  function joinHosted(which: 'openRouter' | 'anthropic', model: string, key: string, remember: boolean) {
    if (!model || !key) {
      status = 'a hosted model needs both a model name and a key';
      render();
      return;
    }
    const preset = PRESETS[which];
    seat(model, { kind: preset.kind, baseUrl: preset.baseUrl, model, apiKey: key, label: model });
    if (remember) {
      const held = store.get<Record<string, string>>(KEYS) ?? {};
      held[which] = key;
      store.set(KEYS, held);
    }
    o.say(`${model} joined · tier 2 · hosted. The key stays on this device and never enters the log`);
    render();
  }

  // ---- the pane -------------------------------------------------------------

  function render() {
    if (!open) {
      o.host.setAttribute('hidden', '');
      return;
    }
    o.host.removeAttribute('hidden');
    let html = '<div class="paneHead"><span class="paneTitle">models</span><button class="paneClose" id="mpClose">×</button></div>';

    html += '<div class="why">' + esc(
      'A model is asked ONLY by a deliberate act: Enter on a brief, or a regen. Nothing on draw, nothing on join.'
    ) + '</div>';

    if (seats.length) {
      html += sep + '<div class="eyebrow">seated</div>';
      for (const s of seats) html += row(s.name, `tier 2 · ${s.locality}`, `everything it proposes is attributed to ${s.id}`);
    }

    // ---- the hand in the room (G5) -----------------------------------------
    // Above the servers on purpose: it is the seat John reaches for while the
    // contract is still being argued about.
    const room = o.room?.() ?? null;
    const handSeated = seats.some((s) => s.name === HAND_SEAT);
    html += sep + '<div class="eyebrow">a hand in the room</div>';
    html += '<div class="why">' + esc(
      'Claude Code, over MCP, as the model. A brief typed at this seat is PARKED in the room — it is a question on the ' +
        'explanation plane, in the log, beside what it is about — and the hand answers it in the same contract a model ' +
        'answers in. Nothing is posted to any server, and no key is held.'
    ) + '</div>';
    if (room) {
      const here = room.presence();
      html += row(
        `room “${room.room}”`,
        here.length ? `with ${here.join(', ')}` : 'alone so far',
        `you are ${room.label} — every hand keeps its own log, and the merge is the board`
      );
      const waitingNow = room.waiting();
      if (waitingNow.length) {
        html += row(
          `${waitingNow.length} brief${waitingNow.length === 1 ? '' : 's'} parked`,
          waitingNow.map((w) => `“${w.words || 'no words'}”`).join(', '),
          'space_pending lists them; space_answer answers one'
        );
      }
    }
    html += '<div class="fieldPills">';
    if (handSeated) html += `<button class="pill" id="mpHandLeave">Leave the seat</button>`;
    else html += `<button class="pill" id="mpHand">${esc(room ? `Seat the hand in “${room.room}”` : 'Join the room, and seat the hand')}</button>`;
    html += '</div>';
    if (!room) {
      html += '<div class="why">' + esc(
        'The room is the relay on this machine: run `node Demos/relay.mjs`, and `node shard-3d/mcp.mjs` beside it — or open this page with ?live=shard&relay=http://127.0.0.1:8020.'
      ) + '</div>';
    }

    html += sep + '<div class="eyebrow">on this machine</div>';
    if (!found.length) {
      html += '<div class="empty">' + esc('nothing answered on :11434 or :1234 — start Ollama or LM Studio and look again') + '</div>';
    }
    for (const f of found) {
      html += `<div class="eyebrow">${esc(f.server)}<span class="srccount"> ${esc(f.baseUrl)}</span></div>`;
      html += '<div class="fieldPills" data-server="' + esc(f.server) + '">';
      for (const m of f.models) html += `<button class="pill" data-model="${esc(m.name)}" data-server="${esc(f.server)}">${esc(m.name)}</button>`;
      html += '</div>';
      if (!f.models.length && f.skipped.length) {
        html += '<div class="why">' + esc('only embedding models here — they cannot chat') + '</div>';
      } else if (f.skipped.length) {
        html += '<div class="why">' + esc(`${f.skipped.length} embedding model${f.skipped.length === 1 ? '' : 's'} hidden — they cannot chat`) + '</div>';
      }
      if (f.error) html += '<div class="why">' + esc(f.error) + '</div>';
    }

    html += sep + '<div class="eyebrow">by key</div>';
    html +=
      '<div class="keyRow">' +
      '<select id="mpWhich"><option value="openRouter">OpenRouter</option><option value="anthropic">Anthropic</option></select>' +
      '<input id="mpModel" class="fieldInput" placeholder="model, e.g. anthropic/claude-opus-5" autocomplete="off">' +
      '<input id="mpKey" class="fieldInput" type="password" placeholder="your key" autocomplete="off">' +
      '<label class="why"><input type="checkbox" id="mpRemember"> remember it on this device</label>' +
      '<button class="pill" id="mpJoin">Join</button>' +
      '</div>';
    html += '<div class="why">' + esc(
      'The key lives in memory, and in this browser only when you tick the box. The join event in the log carries a kind and a name and nothing else, so the log, an autosave and an export are clean of it.'
    ) + '</div>';
    if (status) html += '<div class="fieldLine">' + esc(status) + '</div>';
    html += '<div class="fieldPills"><button class="pill" id="mpDetect">Look again</button></div>';

    o.host.innerHTML = html;
    o.host.classList.add('pane');

    (o.host.querySelector('#mpClose') as HTMLElement | null)?.addEventListener('click', () => {
      open = false;
      render();
      changed();
    });
    (o.host.querySelector('#mpDetect') as HTMLElement | null)?.addEventListener('click', () => {
      status = 'looking…';
      render();
      void probe();
    });
    (o.host.querySelector('#mpHand') as HTMLElement | null)?.addEventListener('click', () => {
      void (async () => {
        const inRoom = o.room?.() ?? (await o.enterRoom?.()) ?? null;
        if (!inRoom) {
          status = 'no room — start the relay (node Demos/relay.mjs) and reload with ?live=shard&relay=http://127.0.0.1:8020';
          render();
          return;
        }
        joinHand(inRoom);
        render();
      })();
    });
    (o.host.querySelector('#mpHandLeave') as HTMLElement | null)?.addEventListener('click', () => {
      const held = seats.find((s) => s.name === HAND_SEAT);
      if (held) {
        const i = seats.indexOf(held);
        seats.splice(i, 1);
        o.say(`${HAND_SEAT} left the seat — the room is still joined, and its ink still arrives`);
      }
      render();
      changed();
    });
    o.host.querySelectorAll('button[data-model]').forEach((el) => {
      el.addEventListener('click', () => {
        const model = (el as HTMLElement).dataset.model!;
        const server = found.find((f) => f.server === (el as HTMLElement).dataset.server);
        if (server) joinLocal(server, model);
      });
    });
    (o.host.querySelector('#mpJoin') as HTMLElement | null)?.addEventListener('click', () => {
      const which = (o.host.querySelector('#mpWhich') as HTMLSelectElement).value as 'openRouter' | 'anthropic';
      const model = (o.host.querySelector('#mpModel') as HTMLInputElement).value.trim();
      const key = (o.host.querySelector('#mpKey') as HTMLInputElement).value.trim();
      const remember = (o.host.querySelector('#mpRemember') as HTMLInputElement).checked;
      joinHosted(which, model, key, remember);
    });
    const held = store.get<Record<string, string>>(KEYS);
    if (held) {
      const which = (o.host.querySelector('#mpWhich') as HTMLSelectElement | null)?.value as 'openRouter' | 'anthropic' | undefined;
      const input = o.host.querySelector('#mpKey') as HTMLInputElement | null;
      if (which && input && held[which]) input.value = held[which];
    }
  }

  async function probe() {
    found = await probeLocal();
    status = found.length ? '' : 'nothing answered.';
    render();
    // The remembered pick rejoins if it can, and is quietly ignored if it
    // cannot — a pointer at a model that has gone is not an error to report.
    const pref = store.get<{ server: string; model: string }>(PREF);
    if (pref && !seats.length) {
      const server = found.find((f) => f.server === pref.server);
      if (server?.models.some((m) => m.name === pref.model)) joinLocal(server, pref.model);
    }
  }

  return {
    seats: () => [...seats],
    first: () => seats[0] ?? null,
    open: () => {
      open = true;
      render();
      void probe();
      changed();
    },
    close: () => {
      open = false;
      render();
      changed();
    },
    isOpen: () => open,
    toggle: () => (open ? (open = false, render(), changed()) : (open = true, render(), void probe(), changed())),
    probe,
    joinWith: (name, transport, config = {}) =>
      seat(
        name,
        { kind: 'openai-compatible', baseUrl: 'http://localhost:0/v1', model: name, label: name, ...config },
        transport
      ),
    joinHand,
    hand: () => seats.find((s) => s.name === HAND_SEAT) ?? null,
    leave: (id) => {
      const i = seats.findIndex((s) => s.id === id);
      if (i >= 0) seats.splice(i, 1);
      render();
      changed();
    },
    onChange: (fn) => void listeners.push(fn),
  };
}

/** The chip a seat shows in the bar. Unused when nothing is seated. */
export function seatChip(seats: Seat[]): HTMLElement {
  return chip(seats.length ? `${seats[0].name}${seats.length > 1 ? ` +${seats.length - 1}` : ''}` : 'no model', {
    why: seats.length
      ? `tier 2 · ${seats[0].locality} — asked only when you press Enter on a brief`
      : 'no model has joined; a brief typed here opens this pane',
  });
}

/** A pill that asks a model carries a dot (the brand's rule, and the canvas's). */
export function modelPill(label: string, why: string, run: () => void): HTMLElement {
  return pill(label, { why, model: true, onclick: run });
}
