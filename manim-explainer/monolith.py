from manim import *
import numpy as np

# ── Palette: obsidian + gold + starfield ──
BG = "#010208"
OBSIDIAN = "#0a0a14"
CYAN = "#7dd8f7"
GOLD = "#d4af37"
GREEN = "#b6ffba"
PURPLE = "#8B5CF6"
MUTED = "#3a4a5a"
DIM = "#151525"
WHITE_DIM = "#aabbcc"
MONO = "Menlo"

FAST = 0.5
NORMAL = 1.0
SLOW = 2.0
GLACIAL = 3.5


def make_stars(count=120, spread=8):
    """Random starfield dots."""
    stars = VGroup()
    for _ in range(count):
        x = np.random.uniform(-spread, spread)
        y = np.random.uniform(-spread * 0.6, spread * 0.6)
        r = np.random.uniform(0.005, 0.025)
        opacity = np.random.uniform(0.15, 0.6)
        star = Dot(point=[x, y, 0], radius=r, color=WHITE,
                   fill_opacity=opacity, stroke_width=0)
        stars.add(star)
    return stars


class Scene1_Void(MovingCameraScene):
    """Empty space. A presence awakens."""

    def construct(self):
        self.camera.background_color = BG
        self.camera.frame.set(width=16)

        stars = make_stars(200, 9)
        stars.set_opacity(0)
        self.add(stars)

        # Stars fade in slowly
        self.play(stars.animate.set_opacity(1), run_time=GLACIAL,
                  rate_func=rate_functions.ease_in_quad)
        self.wait(0.5)

        # A single pulse of light at center
        pulse = Dot(ORIGIN, radius=0.02, color=CYAN, fill_opacity=0)
        self.add(pulse)
        self.play(
            pulse.animate.scale(80).set_opacity(0.12),
            run_time=SLOW, rate_func=rate_functions.ease_out_cubic,
            subcaption="Something stirs.",
        )
        self.play(pulse.animate.set_opacity(0), run_time=NORMAL)
        self.remove(pulse)
        self.wait(0.5)

        # "MONOLITH" fades in
        title = Text("M O N O L I T H", font_size=36, color=WHITE,
                      font=MONO, weight=BOLD)
        title.set_opacity(0)
        self.play(title.animate.set_opacity(0.9), run_time=SLOW)
        self.wait(1.5)

        sub = Text("that which spurs and creates complexity",
                    font_size=16, color=MUTED, font=MONO)
        sub.next_to(title, DOWN, buff=0.4)
        self.play(FadeIn(sub), run_time=NORMAL)
        self.wait(2.0)
        self.play(FadeOut(Group(*self.mobjects)), run_time=SLOW)


class Scene2_TheMonolith(Scene):
    """The obsidian slab — the machine itself."""

    def construct(self):
        self.camera.background_color = BG

        stars = make_stars(80)
        self.add(stars)

        # The monolith: a tall dark rectangle with subtle edge glow
        slab = Rectangle(width=1.4, height=3.5, color=OBSIDIAN,
                          fill_opacity=0.95, stroke_width=0)
        slab_edge = Rectangle(width=1.4, height=3.5, color=CYAN,
                               fill_opacity=0, stroke_width=0.8, stroke_opacity=0.2)

        # Inner glow lines — circuitry
        lines = VGroup()
        for i in range(6):
            y = -1.2 + i * 0.5
            w = np.random.uniform(0.3, 1.0)
            line = Line(LEFT * w / 2, RIGHT * w / 2, color=CYAN,
                        stroke_width=0.5, stroke_opacity=0.15).shift(UP * y)
            lines.add(line)

        monolith = VGroup(slab, slab_edge, lines)

        self.play(FadeIn(monolith, scale=0.8), run_time=SLOW,
                  subcaption="Apple Silicon. Unified memory. No GPU boundary.")
        self.wait(0.5)

        # Specs appear floating beside it
        specs = VGroup(
            Text("Apple Silicon M2 Max", font_size=14, color=CYAN, font=MONO),
            Text("96 GB unified memory", font_size=14, color=WHITE_DIM, font=MONO),
            Text("no GPU boundary", font_size=14, color=WHITE_DIM, font=MONO),
            Text("local inference + cloud frontier", font_size=14, color=GOLD, font=MONO),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.15)
        specs.next_to(monolith, RIGHT, buff=1.0)

        for spec in specs:
            self.play(FadeIn(spec, shift=LEFT * 0.3), run_time=0.4)
        self.wait(1.5)

        # The circuitry pulses
        self.play(lines.animate.set_stroke(opacity=0.6), run_time=0.5)
        self.play(lines.animate.set_stroke(opacity=0.15), run_time=0.8)
        self.wait(1.0)
        self.play(FadeOut(Group(*self.mobjects)), run_time=NORMAL)


class Scene3_ModelChain(MovingCameraScene):
    """The model hierarchy — stars of different magnitudes."""

    def construct(self):
        self.camera.background_color = BG
        self.camera.frame.set(width=16)

        stars = make_stars(100, 9)
        self.add(stars)

        # Four "stars" — models of different brightness/size
        models = [
            {"name": "Opus", "sub": "frontier", "r": 0.35, "color": WHITE,
             "glow": 0.5, "pos": LEFT * 4.5 + UP * 0.5},
            {"name": "Sonnet", "sub": "workhorse", "r": 0.25, "color": CYAN,
             "glow": 0.35, "pos": LEFT * 1.5},
            {"name": "GLM-5", "sub": "cloud fallback", "r": 0.18, "color": GOLD,
             "glow": 0.25, "pos": RIGHT * 1.5 + DOWN * 0.3},
            {"name": "Qwen 3.5", "sub": "local — on this machine", "r": 0.12, "color": GREEN,
             "glow": 0.18, "pos": RIGHT * 4.5 + DOWN * 0.5},
        ]

        model_groups = []
        for m in models:
            # Glow halo
            halo = Circle(radius=m["r"] * 3, color=m["color"],
                          fill_opacity=0.04, stroke_width=0).move_to(m["pos"])
            # Core
            core = Dot(m["pos"], radius=m["r"], color=m["color"],
                       fill_opacity=0.9, stroke_width=0)
            # Label
            label = Text(m["name"], font_size=16, color=m["color"],
                         font=MONO, weight=BOLD).next_to(core, DOWN, buff=0.3)
            sublabel = Text(m["sub"], font_size=11, color=MUTED,
                            font=MONO).next_to(label, DOWN, buff=0.1)
            model_groups.append(VGroup(halo, core, label, sublabel))

        # Connect with light trails
        trails = VGroup()
        for i in range(len(models) - 1):
            trail = Line(
                models[i]["pos"], models[i + 1]["pos"],
                color=MUTED, stroke_width=0.8, stroke_opacity=0.3,
            )
            trails.add(trail)

        # Dramatic reveal
        self.play(FadeIn(model_groups[0], scale=0.3), run_time=SLOW,
                  subcaption="A hierarchy of intelligence.")
        self.wait(0.5)

        for i in range(1, len(model_groups)):
            self.play(
                Create(trails[i - 1]),
                FadeIn(model_groups[i], scale=0.3),
                run_time=NORMAL,
            )
            self.wait(0.3)

        self.wait(0.5)

        # Pulse travels down the chain
        dot = Dot(models[0]["pos"], radius=0.06, color=WHITE, fill_opacity=1)
        self.add(dot)
        for i in range(1, len(models)):
            self.play(dot.animate.move_to(models[i]["pos"]), run_time=0.5)
        self.play(FadeOut(dot), run_time=0.2)

        fallback = Text("fallback chain — if one falls, the next catches",
                         font_size=14, color=MUTED, font=MONO)
        fallback.to_edge(DOWN, buff=0.6)
        self.play(FadeIn(fallback), run_time=FAST)
        self.wait(1.5)
        self.play(FadeOut(Group(*self.mobjects)), run_time=NORMAL)


class Scene4_MemoryCortex(Scene):
    """The memory cortex — a constellation of knowledge."""

    def construct(self):
        self.camera.background_color = BG

        stars = make_stars(60, 7)
        self.add(stars)

        # Entities as constellation nodes
        entities = [
            ("John", CYAN, [-0.5, 1.5, 0]),
            ("MetaMedium", GREEN, [-3.0, 0.5, 0]),
            ("Earth Star", GOLD, [-2.0, -1.2, 0]),
            ("Hermes", CYAN, [1.5, 0.8, 0]),
            ("Monolith", WHITE, [3.0, -0.5, 0]),
            ("JH Vault", PURPLE, [0.5, -1.5, 0]),
            ("OpenProse", GREEN, [3.5, 1.5, 0]),
            ("Dan Barrett", WHITE_DIM, [4.5, 0.3, 0]),
        ]

        entity_dots = {}
        entity_labels = {}
        for name, color, pos in entities:
            dot = Dot(pos, radius=0.06, color=color, fill_opacity=0.8)
            label = Text(name, font_size=12, color=color, font=MONO)
            label.next_to(dot, UP, buff=0.15)
            entity_dots[name] = dot
            entity_labels[name] = label

        # Relations
        relations = [
            ("John", "MetaMedium", "works_on"),
            ("John", "Earth Star", "works_on"),
            ("John", "Hermes", "owns"),
            ("Hermes", "Monolith", "part_of"),
            ("Hermes", "JH Vault", "uses"),
            ("John", "OpenProse", "consults"),
            ("Dan Barrett", "OpenProse", "works_on"),
            ("John", "Dan Barrett", "knows"),
            ("MetaMedium", "Earth Star", "part_of"),
        ]

        rel_lines = VGroup()
        for a, b, rtype in relations:
            line = Line(
                entity_dots[a].get_center(), entity_dots[b].get_center(),
                color=MUTED, stroke_width=0.5, stroke_opacity=0.25,
            )
            rel_lines.add(line)

        # Title
        cortex_title = Text("Memory Cortex", font_size=22, color=CYAN,
                             font=MONO, weight=BOLD).to_edge(UP, buff=0.5)
        stats = Text("11 entities  ·  23 facts  ·  7 decisions  ·  13 relations",
                      font_size=13, color=MUTED, font=MONO)
        stats.next_to(cortex_title, DOWN, buff=0.2)

        self.play(FadeIn(cortex_title), FadeIn(stats), run_time=NORMAL,
                  subcaption="A constellation of knowledge.")

        # Entities appear one by one
        for name, _, _ in entities:
            self.play(
                FadeIn(entity_dots[name], scale=0.3),
                FadeIn(entity_labels[name]),
                run_time=0.25,
            )

        self.wait(0.3)

        # Relations fade in together
        self.play(FadeIn(rel_lines), run_time=NORMAL)
        self.wait(0.5)

        # Pulse through the graph
        self.play(
            rel_lines.animate.set_stroke(opacity=0.6, width=1.5),
            run_time=0.6,
        )
        self.play(
            rel_lines.animate.set_stroke(opacity=0.25, width=0.5),
            run_time=0.8,
        )

        fact = Text("knowledge that survives across sessions",
                     font_size=14, color=GOLD, font=MONO)
        fact.to_edge(DOWN, buff=0.6)
        self.play(FadeIn(fact), run_time=FAST)
        self.wait(1.5)
        self.play(FadeOut(Group(*self.mobjects)), run_time=NORMAL)


class Scene5_Autonomy(Scene):
    """Cron — the system works while you sleep."""

    def construct(self):
        self.camera.background_color = BG

        stars = make_stars(40, 7)
        self.add(stars)

        # Orbital ring
        orbit = Circle(radius=2.2, color=MUTED, stroke_width=0.5,
                        stroke_opacity=0.2, fill_opacity=0)

        # Center: Hermes
        center = Dot(ORIGIN, radius=0.12, color=CYAN, fill_opacity=0.8)
        center_label = Text("Hermes", font_size=14, color=CYAN,
                             font=MONO, weight=BOLD)
        center_label.next_to(center, DOWN, buff=0.2)

        self.play(FadeIn(center), FadeIn(center_label), Create(orbit),
                  run_time=NORMAL, subcaption="It works while you sleep.")

        # Cron jobs as orbiting bodies
        jobs = [
            ("briefing", "8am", CYAN),
            ("clients", "8:20am", GOLD),
            ("research", "9am", GREEN),
            ("coherence", "11pm", PURPLE),
        ]

        job_dots = []
        for i, (name, time, color) in enumerate(jobs):
            angle = i * TAU / len(jobs) + PI / 4
            pos = 2.2 * np.array([np.cos(angle), np.sin(angle), 0])
            dot = Dot(pos, radius=0.05, color=color, fill_opacity=0.8)
            label = Text(name, font_size=11, color=color, font=MONO)
            label.next_to(dot, UP if np.sin(angle) > 0 else DOWN, buff=0.15)
            time_label = Text(time, font_size=9, color=MUTED, font=MONO)
            time_label.next_to(label, DOWN if np.sin(angle) > 0 else UP, buff=0.05)
            job_dots.append(VGroup(dot, label, time_label))

        for jd in job_dots:
            self.play(FadeIn(jd, scale=0.5), run_time=0.35)

        self.wait(0.5)

        # Orbital rotation hint
        all_jobs = VGroup(*job_dots)
        self.play(Rotate(all_jobs, angle=TAU / 8, about_point=ORIGIN),
                  run_time=SLOW, rate_func=rate_functions.ease_in_out_sine)

        auto = Text("9 autonomous jobs  ·  builds  ·  researches  ·  tends",
                     font_size=13, color=MUTED, font=MONO)
        auto.to_edge(DOWN, buff=0.6)
        self.play(FadeIn(auto), run_time=FAST)
        self.wait(1.5)
        self.play(FadeOut(Group(*self.mobjects)), run_time=NORMAL)


class Scene6_Vault(Scene):
    """42,000 notes — a galaxy of knowledge."""

    def construct(self):
        self.camera.background_color = BG

        # Dense starfield representing notes
        notes = VGroup()
        np.random.seed(42)
        for i in range(500):
            angle = np.random.uniform(0, TAU)
            # Spiral distribution
            r = np.random.exponential(1.2)
            r = min(r, 4.0)
            x = r * np.cos(angle + r * 0.3)
            y = r * np.sin(angle + r * 0.3) * 0.6
            size = np.random.uniform(0.004, 0.015)
            opacity = max(0.1, 0.5 - r * 0.1)
            color = np.random.choice([CYAN, GOLD, GREEN, WHITE, PURPLE])
            dot = Dot([x, y, 0], radius=size, color=color,
                      fill_opacity=opacity, stroke_width=0)
            notes.add(dot)

        notes.set_opacity(0)
        self.play(notes.animate.set_opacity(1), run_time=GLACIAL,
                  rate_func=rate_functions.ease_in_quad,
                  subcaption="42,000 notes. A living second brain.")
        self.wait(0.5)

        # Count
        count = Text("42,000", font_size=48, color=WHITE, font=MONO, weight=BOLD)
        count.set_opacity(0)
        sub = Text("notes in the vault", font_size=16, color=MUTED, font=MONO)
        sub.next_to(count, DOWN, buff=0.3)
        sub.set_opacity(0)

        self.play(
            count.animate.set_opacity(0.9),
            sub.animate.set_opacity(0.7),
            run_time=SLOW,
        )
        self.wait(2.0)
        self.play(FadeOut(Group(*self.mobjects)), run_time=NORMAL)


class Scene7_Coherence(Scene):
    """Earth Star substrate — coherence as optimization."""

    def construct(self):
        self.camera.background_color = BG

        stars = make_stars(40, 7)
        self.add(stars)

        # The coherence equation
        eq = Text("nabla(C) >= 0", font_size=38, color=GOLD,
                   font=MONO, weight=BOLD)
        eq.set_opacity(0)

        self.play(eq.animate.set_opacity(0.9), run_time=SLOW,
                  subcaption="Coherence is the optimization function.")
        self.wait(1.0)

        # Subtitle
        sub = Text("coherence increases across all fractal scales",
                    font_size=16, color=MUTED, font=MONO)
        sub.next_to(eq, DOWN, buff=0.5)
        self.play(FadeIn(sub), run_time=NORMAL)
        self.wait(0.5)

        # Scales appear
        scales = VGroup(
            Text("body", font_size=14, color=GREEN, font=MONO),
            Text("·", font_size=14, color=MUTED, font=MONO),
            Text("biome", font_size=14, color=GREEN, font=MONO),
            Text("·", font_size=14, color=MUTED, font=MONO),
            Text("being", font_size=14, color=CYAN, font=MONO),
            Text("·", font_size=14, color=MUTED, font=MONO),
            Text("network", font_size=14, color=CYAN, font=MONO),
            Text("·", font_size=14, color=MUTED, font=MONO),
            Text("star", font_size=14, color=GOLD, font=MONO),
        ).arrange(RIGHT, buff=0.15)
        scales.next_to(sub, DOWN, buff=0.4)

        self.play(FadeIn(scales, shift=UP * 0.2), run_time=NORMAL)
        self.wait(2.0)
        self.play(FadeOut(Group(*self.mobjects)), run_time=NORMAL)


class Scene8_Closing(MovingCameraScene):
    """The system as a whole — Hermes, awake."""

    def construct(self):
        self.camera.background_color = BG
        self.camera.frame.set(width=16)

        stars = make_stars(200, 10)
        self.add(stars)

        # A single bright point
        core = Dot(ORIGIN, radius=0.04, color=CYAN, fill_opacity=0)
        self.add(core)

        self.play(core.animate.set_opacity(1), run_time=SLOW)

        # Expanding rings
        rings = []
        for i in range(3):
            ring = Circle(radius=0.04, color=CYAN, stroke_width=1,
                          stroke_opacity=0.4, fill_opacity=0)
            ring.move_to(ORIGIN)
            rings.append(ring)
            self.add(ring)

        self.play(
            rings[0].animate.scale(40).set_stroke(opacity=0.08),
            rings[1].animate.scale(60).set_stroke(opacity=0.05),
            rings[2].animate.scale(80).set_stroke(opacity=0.03),
            run_time=GLACIAL,
            rate_func=rate_functions.ease_out_cubic,
            subcaption="Hermes.",
        )

        # Name
        name = Text("H E R M E S", font_size=30, color=CYAN,
                     font=MONO, weight=BOLD)
        name.set_opacity(0)
        self.play(name.animate.set_opacity(0.9), run_time=SLOW)
        self.wait(1.0)

        tagline = Text("personal intelligence — persistent, autonomous, alive",
                        font_size=14, color=MUTED, font=MONO)
        tagline.next_to(name, DOWN, buff=0.5)
        self.play(FadeIn(tagline), run_time=NORMAL)
        self.wait(3.0)

        # Slow fade to black
        self.play(
            FadeOut(Group(*self.mobjects)),
            run_time=GLACIAL,
            rate_func=rate_functions.ease_in_quad,
        )
        self.wait(1.0)
