from manim import *
import numpy as np

# ── Design tokens (johnhanacek.com) ──
BG = "#020a12"
CYAN = "#7dd8f7"
GOLD = "#d4af37"
GREEN = "#b6ffba"
MUTED = "#4a6a7a"
DIM = "#1a3a4a"
PURPLE = "#8B5CF6"
MONO = "Menlo"

FAST = 0.5
NORMAL = 0.8
SLOW = 1.5


class Scene1_TheMark(Scene):
    """A single stroke — raw, untyped."""

    def construct(self):
        self.camera.background_color = BG

        points = [
            [-2.5, 0.8, 0], [-1.5, 1.2, 0], [-0.3, 0.6, 0],
            [0.5, 1.4, 0], [1.2, 0.3, 0], [2.0, 0.9, 0], [2.5, 0.5, 0],
        ]
        stroke = VMobject(stroke_color=CYAN, stroke_width=3, stroke_opacity=0.8,
                          fill_opacity=0)
        stroke.set_points_smoothly([np.array(p) for p in points])

        title = Text("A mark has no type.", font_size=28, color=WHITE,
                      font=MONO, weight=BOLD).to_edge(DOWN, buff=0.8)

        self.play(Create(stroke), run_time=SLOW,
                  subcaption="A mark has no type.")
        self.wait(0.3)

        self.play(stroke.animate.set_stroke(width=5), run_time=0.3)
        self.play(stroke.animate.set_stroke(width=3), run_time=0.3)

        coords = Text(
            "[[−2.5, 0.8], [−1.5, 1.2], [0.5, 1.4], ...]",
            font_size=16, color=MUTED, font=MONO,
        ).next_to(stroke, UP, buff=0.3)

        self.play(FadeIn(title), FadeIn(coords), run_time=FAST)
        self.wait(1.2)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.4)


class Scene2_Recognition(Scene):
    """The stroke becomes a recognized shape."""

    def construct(self):
        self.camera.background_color = BG

        rough_points = []
        for t in np.linspace(0, 2 * PI, 30):
            noise = np.random.uniform(-0.12, 0.12, 2)
            rough_points.append([
                1.2 * np.cos(t) + noise[0],
                1.2 * np.sin(t) + noise[1], 0,
            ])
        rough_circle = VMobject(stroke_color=CYAN, stroke_width=3, stroke_opacity=0.7,
                                fill_opacity=0)
        rough_circle.set_points_smoothly([np.array(p) for p in rough_points])

        self.play(Create(rough_circle), run_time=NORMAL,
                  subcaption="Until a system recognizes it.")
        self.wait(0.3)

        fp_items = VGroup(
            Text("aspect:      0.96", font_size=14, color=MUTED, font=MONO),
            Text("straightness: 0.22", font_size=14, color=MUTED, font=MONO),
            Text("closure:     12px", font_size=14, color=MUTED, font=MONO),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.12).to_edge(RIGHT, buff=0.8)

        self.play(FadeIn(fp_items, shift=LEFT * 0.3), run_time=FAST)
        self.wait(0.5)

        perfect = Circle(radius=1.2, color=CYAN, stroke_width=3, fill_opacity=0)
        self.play(Transform(rough_circle, perfect), run_time=NORMAL)
        self.wait(0.3)

        badge = VGroup(
            RoundedRectangle(width=2.2, height=0.42, corner_radius=0.1,
                             color=GOLD, fill_opacity=0.15, stroke_width=1),
            Text("circle  0.87", font_size=16, color=GOLD, font=MONO),
        )
        badge[1].move_to(badge[0])
        badge.next_to(perfect, DOWN, buff=0.4)

        title = Text("Until a system recognizes it.", font_size=28,
                      color=WHITE, font=MONO, weight=BOLD).to_edge(DOWN, buff=0.8)

        self.play(FadeIn(badge, scale=0.8), FadeIn(title), run_time=FAST)
        self.wait(1.2)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.4)


class Scene3_Composition(Scene):
    """Three shapes compose into a named vocabulary entry."""

    def construct(self):
        self.camera.background_color = BG

        c1 = Circle(radius=0.5, color=CYAN, stroke_width=2, fill_opacity=0).shift(LEFT * 2 + UP * 0.5)
        c2 = Circle(radius=0.5, color=CYAN, stroke_width=2, fill_opacity=0).shift(RIGHT * 2 + UP * 0.5)
        c3 = Circle(radius=0.5, color=CYAN, stroke_width=2, fill_opacity=0).shift(DOWN * 1.2)

        self.play(Create(c1), Create(c2), Create(c3), run_time=NORMAL,
                  subcaption="Compositions create vocabulary.")
        self.wait(0.2)

        l1 = Line(c1.get_center(), c2.get_center(), color=GOLD, stroke_width=1.5, stroke_opacity=0.5)
        l2 = Line(c2.get_center(), c3.get_center(), color=GOLD, stroke_width=1.5, stroke_opacity=0.5)
        l3 = Line(c3.get_center(), c1.get_center(), color=GOLD, stroke_width=1.5, stroke_opacity=0.5)

        self.play(Create(l1), Create(l2), Create(l3), run_time=FAST)
        self.wait(0.3)

        group = VGroup(c1, c2, c3, l1, l2, l3)
        highlight = SurroundingRectangle(group, color=GOLD, buff=0.3,
                                          corner_radius=0.15, stroke_width=1.5)
        name_badge = VGroup(
            RoundedRectangle(width=2.5, height=0.42, corner_radius=0.1,
                             color=GREEN, fill_opacity=0.15, stroke_width=1),
            Text("\"molecule\"", font_size=18, color=GREEN, font=MONO),
        )
        name_badge[1].move_to(name_badge[0])
        name_badge.next_to(highlight, UP, buff=0.3)

        title = Text("Compositions create vocabulary.", font_size=28,
                      color=WHITE, font=MONO, weight=BOLD).to_edge(DOWN, buff=0.8)

        self.play(Create(highlight), FadeIn(name_badge, shift=DOWN * 0.2),
                  FadeIn(title), run_time=NORMAL)
        self.wait(1.2)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.4)


class Scene4_Doodling(Scene):
    """Freehand doodling — shapes recognized in real-time."""

    def construct(self):
        self.camera.background_color = BG

        # Split screen: drawing area left, recognized shapes right
        divider = DashedLine(
            UP * 3, DOWN * 3, color=MUTED, stroke_width=0.5,
            dash_length=0.1, dashed_ratio=0.4,
        ).shift(RIGHT * 0.5)
        divider.set_opacity(0.3)

        draw_label = Text("draw", font_size=14, color=MUTED, font=MONO
                          ).to_edge(UP, buff=0.3).shift(LEFT * 2.5)
        recog_label = Text("recognized", font_size=14, color=MUTED, font=MONO
                           ).to_edge(UP, buff=0.3).shift(RIGHT * 3)

        self.add(divider, draw_label, recog_label)

        # Doodle 1: rough rectangle
        rect_pts = [
            [-4.5, 1.2, 0], [-2.5, 1.3, 0], [-2.4, 0.0, 0],
            [-4.6, -0.1, 0], [-4.5, 1.2, 0],
        ]
        rough_rect = VMobject(stroke_color=CYAN, stroke_width=2.5, stroke_opacity=0.7,
                              fill_opacity=0)
        rough_rect.set_points_smoothly([np.array(p) for p in rect_pts])

        clean_rect = Rectangle(width=2, height=1.2, color=CYAN, stroke_width=2, fill_opacity=0
                                ).shift(RIGHT * 3.5 + UP * 1.2)
        rect_label = Text("rect 0.78", font_size=13, color=GOLD, font=MONO
                          ).next_to(clean_rect, DOWN, buff=0.15)

        self.play(Create(rough_rect), run_time=NORMAL,
                  subcaption="Shapes recognized as you draw.")
        self.play(FadeIn(clean_rect, scale=0.5), FadeIn(rect_label), run_time=FAST)
        self.wait(0.2)

        # Doodle 2: rough line
        line_pts = [[-4.2, -0.5, 0], [-3.8, -0.6, 0], [-3.0, -0.45, 0], [-2.3, -0.55, 0]]
        rough_line = VMobject(stroke_color=GREEN, stroke_width=2.5, stroke_opacity=0.7,
                              fill_opacity=0)
        rough_line.set_points_smoothly([np.array(p) for p in line_pts])

        clean_line = Line(LEFT * 1 + DOWN * 0.1, RIGHT * 1 + DOWN * 0.1,
                          color=GREEN, stroke_width=2).shift(RIGHT * 3.5)
        line_label = Text("line 0.94", font_size=13, color=GOLD, font=MONO
                          ).next_to(clean_line, DOWN, buff=0.15)

        self.play(Create(rough_line), run_time=0.6)
        self.play(FadeIn(clean_line, scale=0.5), FadeIn(line_label), run_time=FAST)
        self.wait(0.2)

        # Doodle 3: rough circle
        circ_pts = []
        for t in np.linspace(0, 2 * PI, 20):
            circ_pts.append([
                -3.5 + 0.6 * np.cos(t) + np.random.uniform(-0.08, 0.08),
                -1.8 + 0.6 * np.sin(t) + np.random.uniform(-0.08, 0.08), 0,
            ])
        rough_circ = VMobject(stroke_color=GOLD, stroke_width=2.5, stroke_opacity=0.7,
                              fill_opacity=0)
        rough_circ.set_points_smoothly([np.array(p) for p in circ_pts])

        clean_circ = Circle(radius=0.5, color=GOLD, stroke_width=2, fill_opacity=0
                            ).shift(RIGHT * 3.5 + DOWN * 1.5)
        circ_label = Text("circle 0.91", font_size=13, color=GOLD, font=MONO
                          ).next_to(clean_circ, DOWN, buff=0.15)

        self.play(Create(rough_circ), run_time=0.6)
        self.play(FadeIn(clean_circ, scale=0.5), FadeIn(circ_label), run_time=FAST)
        self.wait(0.8)

        title = Text("Shapes recognized as you draw.", font_size=26,
                      color=WHITE, font=MONO, weight=BOLD).to_edge(DOWN, buff=0.6)
        self.play(FadeIn(title), run_time=FAST)
        self.wait(1.0)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.4)


class Scene5_MathModulation(Scene):
    """Drawings ARE mathematics — same object, different view."""

    def construct(self):
        self.camera.background_color = BG

        # Left: a circle with draggable radius
        circle = Circle(radius=1.0, color=CYAN, stroke_width=2.5,
                         fill_opacity=0.08)
        circle.shift(LEFT * 3)

        r_line = Line(circle.get_center(), circle.get_center() + RIGHT * 1.0,
                      color=GOLD, stroke_width=1.5)
        r_label = Text("r", font_size=18, color=GOLD, font=MONO
                        ).next_to(r_line, UP, buff=0.1)

        # Right: the equation responding
        eq = Text("A = pi * r^2", font_size=32, color=WHITE, font=MONO, weight=BOLD)
        eq.shift(RIGHT * 2.5 + UP * 1.5)

        eq_val = Text("A = pi * (1.0)^2 = 3.14", font_size=22, color=MUTED, font=MONO)
        eq_val.next_to(eq, DOWN, buff=0.3)

        self.play(Create(circle), Create(r_line), FadeIn(r_label),
                  run_time=NORMAL, subcaption="Drawings are mathematics.")
        self.play(Write(eq), FadeIn(eq_val), run_time=NORMAL)
        self.wait(0.5)

        # "Drag" the radius — circle grows
        big_circle = Circle(radius=1.8, color=CYAN, stroke_width=2.5,
                             fill_opacity=0.08).shift(LEFT * 3)
        big_r_line = Line(big_circle.get_center(),
                          big_circle.get_center() + RIGHT * 1.8,
                          color=GOLD, stroke_width=1.5)
        big_r_label = Text("r", font_size=18, color=GOLD, font=MONO
                           ).next_to(big_r_line, UP, buff=0.1)

        eq_val2 = Text("A = pi * (1.8)^2 = 10.18", font_size=22, color=CYAN, font=MONO)
        eq_val2.next_to(eq, DOWN, buff=0.3)

        self.play(
            Transform(circle, big_circle),
            Transform(r_line, big_r_line),
            Transform(r_label, big_r_label),
            Transform(eq_val, eq_val2),
            run_time=SLOW,
        )
        self.wait(0.5)

        # Now show a sine wave modulated by a drawn amplitude
        wave_axes = Axes(
            x_range=[0, 4 * PI, PI], y_range=[-2, 2, 1],
            x_length=5, y_length=2,
            axis_config={"color": MUTED, "stroke_width": 1},
        ).shift(RIGHT * 2.5 + DOWN * 1.5)

        wave1 = wave_axes.plot(lambda x: np.sin(x), color=GREEN,
                                stroke_width=2)
        wave_label = Text("sin(x)", font_size=14, color=GREEN, font=MONO
                          ).next_to(wave_axes, UP, buff=0.15)

        self.play(
            FadeOut(eq), FadeOut(eq_val),
            Create(wave_axes), Create(wave1), FadeIn(wave_label),
            run_time=NORMAL,
        )
        self.wait(0.3)

        # Modulate: amplitude changes (drawn bigger → louder wave)
        wave2 = wave_axes.plot(lambda x: 1.8 * np.sin(x), color=CYAN,
                                stroke_width=2.5)
        wave_label2 = Text("1.8 * sin(x)", font_size=14, color=CYAN, font=MONO
                           ).next_to(wave_axes, UP, buff=0.15)

        self.play(
            Transform(wave1, wave2),
            Transform(wave_label, wave_label2),
            run_time=NORMAL,
            subcaption="Same object. Different lens.",
        )

        title = Text("Drawings are mathematics.", font_size=26,
                      color=WHITE, font=MONO, weight=BOLD).to_edge(DOWN, buff=0.5)
        self.play(FadeIn(title), run_time=FAST)
        self.wait(1.2)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.4)


class Scene6_CodeGen(Scene):
    """Drawings ARE code — the same structure, viewed as syntax."""

    def construct(self):
        self.camera.background_color = BG

        # Left: the molecule composition from scene 3
        c1 = Circle(radius=0.35, color=CYAN, stroke_width=2, fill_opacity=0).shift(LEFT * 4.5 + UP * 1.0)
        c2 = Circle(radius=0.35, color=CYAN, stroke_width=2, fill_opacity=0).shift(LEFT * 3.0 + UP * 1.0)
        c3 = Circle(radius=0.35, color=CYAN, stroke_width=2, fill_opacity=0).shift(LEFT * 3.75 + DOWN * 0.3)
        l1 = Line(c1.get_center(), c2.get_center(), color=GOLD, stroke_width=1, stroke_opacity=0.5)
        l2 = Line(c2.get_center(), c3.get_center(), color=GOLD, stroke_width=1, stroke_opacity=0.5)
        l3 = Line(c3.get_center(), c1.get_center(), color=GOLD, stroke_width=1, stroke_opacity=0.5)
        drawing = VGroup(c1, c2, c3, l1, l2, l3)

        mol_label = Text("\"molecule\"", font_size=14, color=GREEN, font=MONO
                         ).next_to(drawing, UP, buff=0.2)

        # Arrow
        arrow = Arrow(LEFT * 2.2, LEFT * 0.8, color=GOLD, stroke_width=2,
                      tip_length=0.15, buff=0)

        # Right: generated code
        code_lines = [
            ("const", " molecule ", "= {"),
            ("  nodes", ": ["),
            ("    { ", "id", ": 1, ", "x", ": 0, ", "y", ": 1.0 },"),
            ("    { ", "id", ": 2, ", "x", ": 1.5, ", "y", ": 1.0 },"),
            ("    { ", "id", ": 3, ", "x", ": 0.75, ", "y", ": -0.3 },"),
            ("  ],"),
            ("  edges", ": ["),
            ("    [1, 2], [2, 3], [3, 1]"),
            ("  ],"),
            ("  ", "type", ": ", "\"composition\""),
            ("};"),
        ]

        code_group = VGroup()
        for i, parts in enumerate(code_lines):
            line_group = VGroup()
            x_offset = 0
            for j, part in enumerate(parts):
                if part.strip() in ('const', 'nodes', 'edges', 'type'):
                    color = PURPLE
                elif part.strip().startswith('"'):
                    color = GREEN
                elif part.strip() in ('id', 'x', 'y'):
                    color = CYAN
                else:
                    color = MUTED
                t = Text(part, font_size=13, color=color, font=MONO)
                if line_group:
                    t.next_to(line_group[-1], RIGHT, buff=0)
                line_group.add(t)
            code_group.add(line_group)

        code_group.arrange(DOWN, aligned_edge=LEFT, buff=0.06)
        code_group.shift(RIGHT * 2.5)

        # Code background
        code_bg = RoundedRectangle(
            width=code_group.width + 0.6, height=code_group.height + 0.5,
            corner_radius=0.12, color=MUTED, fill_opacity=0.06, stroke_width=0.5,
        ).move_to(code_group)

        # Build up
        self.play(FadeIn(drawing, scale=0.7), FadeIn(mol_label),
                  run_time=NORMAL, subcaption="Drawings are code.")
        self.wait(0.3)

        self.play(GrowArrow(arrow), run_time=FAST)
        self.play(FadeIn(code_bg), run_time=0.2)

        # Type out code lines one by one
        for i, line in enumerate(code_group):
            self.play(FadeIn(line, shift=RIGHT * 0.2),
                      run_time=0.15 if i > 1 else 0.3)

        self.wait(0.5)

        title = Text("Drawings are code.", font_size=26,
                      color=WHITE, font=MONO, weight=BOLD).to_edge(DOWN, buff=0.5)
        self.play(FadeIn(title), run_time=FAST)
        self.wait(1.5)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.4)


class Scene7_TheGraph(Scene):
    """Type emerges from connections, not labels."""

    def construct(self):
        self.camera.background_color = BG

        center = Circle(radius=0.35, color=CYAN, fill_opacity=0.15, stroke_width=2)
        center_label = Text("O", font_size=22, color=CYAN, font=MONO)
        center_label.move_to(center)
        center_group = VGroup(center, center_label)

        def make_node(text, color, pos):
            r = RoundedRectangle(
                width=len(text) * 0.15 + 0.5, height=0.45,
                corner_radius=0.1, color=color,
                fill_opacity=0.1, stroke_width=1.5,
            ).move_to(pos)
            t = Text(text, font_size=15, color=color, font=MONO).move_to(r)
            return VGroup(r, t)

        n_shape = make_node("shape", MUTED, UP * 1.6 + LEFT * 2)
        n_circle = make_node("circle", CYAN, UP * 1.6)
        n_bubble = make_node("bubble", GREEN, UP * 1.6 + RIGHT * 2)
        n_whole = make_node("wholeness", GOLD, DOWN * 1.6 + LEFT * 1)
        n_contain = make_node("containment", GOLD, DOWN * 1.6 + RIGHT * 1.5)

        nodes = [n_shape, n_circle, n_bubble, n_whole, n_contain]
        edge_labels = ["structural", "recognized", "named", "semantic", "image-schema"]
        edge_colors = [MUTED, CYAN, GREEN, GOLD, GOLD]

        edges = []
        for node, label, col in zip(nodes, edge_labels, edge_colors):
            line = Line(center.get_center(), node.get_center(),
                        color=col, stroke_width=1, stroke_opacity=0.4)
            lbl = Text(label, font_size=11, color=col, font=MONO)
            lbl.set_opacity(0.5)
            lbl.move_to(line.get_center())
            lbl.shift(UP * 0.18 + RIGHT * 0.08)
            edges.append(VGroup(line, lbl))

        self.play(FadeIn(center_group, scale=0.5), run_time=FAST,
                  subcaption="What something IS equals what it connects to.")
        self.wait(0.3)

        for node, edge in zip(nodes, edges):
            self.play(Create(edge[0]), FadeIn(edge[1]), FadeIn(node), run_time=0.35)
        self.wait(0.3)

        title = Text("What something IS = what it connects to.",
                      font_size=24, color=WHITE, font=MONO, weight=BOLD)
        title.to_edge(DOWN, buff=0.6)
        self.play(FadeIn(title), run_time=FAST)

        all_edges = VGroup(*[e[0] for e in edges])
        self.play(all_edges.animate.set_stroke(opacity=0.9, width=2.5), run_time=0.4)
        self.play(all_edges.animate.set_stroke(opacity=0.4, width=1), run_time=0.6)
        self.wait(1.2)
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.4)


class Scene8_TheLoop(Scene):
    """The recursive cycle — interfaces that learn through use."""

    def construct(self):
        self.camera.background_color = BG

        stages = ["mark", "shape", "composition", "meaning"]
        colors = [CYAN, GREEN, GOLD, WHITE]
        n = len(stages)
        radius = 1.6
        nodes = []
        for i, (stage, col) in enumerate(zip(stages, colors)):
            angle = PI / 2 - i * TAU / n
            pos = radius * np.array([np.cos(angle), np.sin(angle), 0])
            r = RoundedRectangle(
                width=2.0, height=0.5, corner_radius=0.12,
                color=col, fill_opacity=0.12, stroke_width=1.5,
            ).move_to(pos)
            t = Text(stage, font_size=18, color=col, font=MONO, weight=BOLD)
            t.move_to(r)
            nodes.append(VGroup(r, t))

        arrows = []
        for i in range(n):
            start = nodes[i].get_center()
            end = nodes[(i + 1) % n].get_center()
            arrow = CurvedArrow(start, end, color=MUTED, stroke_width=1.5,
                                angle=-TAU / (n * 1.5), tip_length=0.12)
            arrow.set_opacity(0.5)
            arrows.append(arrow)

        for node in nodes:
            self.play(FadeIn(node, scale=0.7), run_time=0.25)

        self.play(*[Create(a) for a in arrows], run_time=NORMAL,
                  subcaption="Interfaces that learn through use.")
        self.wait(0.3)

        # Pulse around the loop
        dot = Dot(color=CYAN, radius=0.07)
        dot.move_to(nodes[0].get_center())
        self.add(dot)
        for i in range(n):
            target = nodes[(i + 1) % n].get_center()
            self.play(
                dot.animate.move_to(target),
                nodes[(i + 1) % n][0].animate.set_stroke(color=CYAN, width=2.5),
                run_time=0.3,
            )
            self.play(
                nodes[(i + 1) % n][0].animate.set_stroke(
                    color=colors[(i + 1) % n], width=1.5),
                run_time=0.15,
            )
        self.play(FadeOut(dot), run_time=0.15)

        title = Text("Interfaces that learn through use.", font_size=26,
                      color=WHITE, font=MONO, weight=BOLD)
        title.to_edge(DOWN, buff=0.9)

        logo = Text("MetaMedium", font_size=34, color=CYAN,
                     font=MONO, weight=BOLD)
        logo.to_edge(DOWN, buff=0.4)

        self.play(FadeIn(title), run_time=FAST)
        self.wait(1.2)
        self.play(ReplacementTransform(title, logo), run_time=NORMAL)
        self.wait(2.0)
        self.play(FadeOut(Group(*self.mobjects)), run_time=SLOW)
