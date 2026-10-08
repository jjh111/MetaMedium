// A small vault of Markdown notes, made up (V1-SPEC IN1, the fixtures).
//
// A notes vault is plain files that link to each other by `[[name]]` and carry `#tags`: some in the text, some in
// a header. This one is about a garden, because a garden has nothing in it that belongs to anyone. It has a note
// that is only links, one that links to nothing, a link to a note that does not exist, an alias, a heading link, an
// embed, a tag inside code (which is not a tag), a number after a hash (which is not either), a header with tags
// written three ways, and a day's note named for its date.

export interface VaultNote {
  name: string;
  text: string;
}

export const VAULT: VaultNote[] = [
  {
    name: 'Garden.md',
    text: [
      '# Garden',
      '',
      'Everything about the plot, in one place. #garden',
      '',
      '- [[Tomatoes]] — the bed by the fence',
      '- [[Seed starting|starting seeds]] in March',
      '- [[Compost#Turning]] every other week',
      '- [[Beans]] (not written yet)',
      '',
      '![[Plot map]]',
      '',
    ].join('\n'),
  },
  {
    name: 'Tomatoes.md',
    text: [
      '---',
      'title: Tomatoes',
      'tags: [garden, fruit]',
      'created: 2026-03-14',
      '---',
      '',
      '# Tomatoes',
      '',
      'Plant out after the last frost. See [[Seed starting]] for the start and [[Compost]] for the bed. #fruit/tomato',
      '',
      'Issue #12 is a number, not a tag, and `#notatag` and the fence below are code:',
      '',
      '```',
      '#also-not-a-tag [[not-a-link]]',
      '```',
      '',
      'Read more at https://example.com/page#section, which has no tag in it.',
    ].join('\n'),
  },
  {
    name: 'Seed starting.md',
    text: [
      '---',
      'tags:',
      '  - garden',
      '  - spring',
      'date: 2026-02-27',
      '---',
      '# Seed starting',
      '',
      'Trays on the sill, covered until they show. Back to [[Garden]]. A word on [[Tomatoes|tomato seedlings]] too. #spring',
    ].join('\n'),
  },
  {
    name: 'Compost.md',
    text: ['# Compost', '', '## Turning', '', 'Fork it over every other week.', '', '## Browns and greens', '', 'Two parts brown to one part green. #garden #Spring'].join('\n'),
  },
  {
    name: 'Plot map.md',
    text: 'A map of the plot is drawn on the back of an envelope. Nothing links out of this one.',
  },
  {
    name: '2026-10-02.md',
    text: ['# Thursday', '', 'Lifted the last of the beans and left the roots in. Wrote it into [[Garden]]. #log tags: #2026'].join('\n'),
  },
];
