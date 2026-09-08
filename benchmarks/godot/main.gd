extends Node2D

const STEADY_MOTES: int = 36
const BUSY_MOTES: int = 72
const PARTICLE_POOL: int = 96
const STAR_COUNT: int = 120
const WORLD_CULL_DISTANCE: float = 720.0
const WORLD_ZOOM: float = 0.84

const PLACES: Array[Dictionary] = [
	{"id": "english", "name": "English Grove", "subtitle": "Stories & words", "pos": Vector2(220.0, 210.0), "accent": Color("73ddff")},
	{"id": "german", "name": "German Harbor", "subtitle": "Tiny missions", "pos": Vector2(600.0, 165.0), "accent": Color("8fa7ff")},
	{"id": "chess", "name": "Chess Citadel", "subtitle": "Think ahead", "pos": Vector2(950.0, 300.0), "accent": Color("ffd166")},
	{"id": "knowledge", "name": "Knowledge Observatory", "subtitle": "How do we know?", "pos": Vector2(860.0, 650.0), "accent": Color("d493ff")},
	{"id": "habits", "name": "Habits Garden", "subtitle": "Tiny wins", "pos": Vector2(505.0, 720.0), "accent": Color("7ff0b8")},
	{"id": "lab", "name": "Curiosity Lab", "subtitle": "Try & discover", "pos": Vector2(160.0, 590.0), "accent": Color("ff8fb9")},
]

var selected_index: int = 0
var busy: bool = false
var elapsed: float = 0.0
var busy_timer: float = 0.0
var metrics_elapsed: float = 0.0
var camera_pos: Vector2 = Vector2.ZERO
var camera_target: Vector2 = Vector2.ZERO
var actor_pos: Vector2 = Vector2.ZERO
var actor_target: Vector2 = Vector2.ZERO

var star_positions: PackedVector2Array = PackedVector2Array()
var star_sizes: PackedFloat32Array = PackedFloat32Array()
var star_alphas: PackedFloat32Array = PackedFloat32Array()
var mote_origins: PackedVector2Array = PackedVector2Array()
var mote_phases: PackedFloat32Array = PackedFloat32Array()
var mote_speeds: PackedFloat32Array = PackedFloat32Array()
var particle_positions: PackedVector2Array = PackedVector2Array()
var particle_velocities: PackedVector2Array = PackedVector2Array()
var particle_life: PackedFloat32Array = PackedFloat32Array()
var particle_max_life: PackedFloat32Array = PackedFloat32Array()
var frame_samples: PackedFloat32Array = PackedFloat32Array()

var metrics_label: Label
var mode_label: Label
var selected_label: Label
var fallback_font: Font

func _ready() -> void:
	fallback_font = ThemeDB.fallback_font
	initialize_stars()
	initialize_motes()
	initialize_particles()
	create_ui()
	visit_world(0, false)
	set_process(true)

func _process(delta: float) -> void:
	elapsed += delta
	camera_pos = camera_pos.lerp(camera_target, min(1.0, delta * 6.2))
	actor_pos = actor_pos.lerp(actor_target, min(1.0, delta * 7.0))

	if busy:
		busy_timer += delta
		if busy_timer >= 0.18:
			busy_timer = 0.0
			emit_particles(5, 0.72)

	update_particles(delta)
	frame_samples.append(delta * 1000.0)
	if frame_samples.size() > 600:
		frame_samples.remove_at(0)

	metrics_elapsed += delta
	if metrics_elapsed >= 1.0:
		metrics_elapsed = 0.0
		refresh_metrics()

	queue_redraw()

func _draw() -> void:
	draw_backdrop()
	draw_routes()
	draw_worlds()
	draw_motes()
	draw_particles()
	draw_actor()

func screen_center() -> Vector2:
	return get_viewport_rect().size * 0.5

func world_to_screen(point: Vector2) -> Vector2:
	return screen_center() + (point - camera_pos) * WORLD_ZOOM

func initialize_stars() -> void:
	var rng: RandomNumberGenerator = RandomNumberGenerator.new()
	rng.seed = 20260908
	for _i: int in range(STAR_COUNT):
		star_positions.append(Vector2(rng.randf_range(-100.0, 1220.0), rng.randf_range(-80.0, 920.0)))
		star_sizes.append(rng.randf_range(0.8, 2.4))
		star_alphas.append(rng.randf_range(0.15, 0.55))

func initialize_motes() -> void:
	for i: int in range(BUSY_MOTES):
		mote_origins.append(Vector2.ZERO)
		mote_phases.append(float(i) * 0.71)
		mote_speeds.append(0.38 + float(i % 7) * 0.07)

func initialize_particles() -> void:
	for _i: int in range(PARTICLE_POOL):
		particle_positions.append(Vector2.ZERO)
		particle_velocities.append(Vector2.ZERO)
		particle_life.append(0.0)
		particle_max_life.append(0.0)

func draw_backdrop() -> void:
	draw_circle(world_to_screen(Vector2(330.0, 260.0)), 330.0 * WORLD_ZOOM, Color(0.39, 0.28, 0.78, 0.11))
	draw_circle(world_to_screen(Vector2(850.0, 590.0)), 390.0 * WORLD_ZOOM, Color(0.11, 0.62, 0.72, 0.09))
	draw_circle(world_to_screen(Vector2(760.0, 120.0)), 260.0 * WORLD_ZOOM, Color(0.72, 0.24, 0.59, 0.07))
	for i: int in range(STAR_COUNT):
		var p: Vector2 = world_to_screen(star_positions[i])
		draw_circle(p, star_sizes[i], Color(1.0, 1.0, 1.0, star_alphas[i]))

func draw_routes() -> void:
	for i: int in range(PLACES.size()):
		var a: Vector2 = world_to_screen(PLACES[i]["pos"] as Vector2)
		var b: Vector2 = world_to_screen(PLACES[(i + 1) % PLACES.size()]["pos"] as Vector2)
		draw_line(a, b, Color(0.5, 0.6, 1.0, 0.11), 4.0)

func draw_worlds() -> void:
	for i: int in range(PLACES.size()):
		var place: Dictionary = PLACES[i]
		var world_pos: Vector2 = place["pos"] as Vector2
		if world_pos.distance_to(camera_pos) > WORLD_CULL_DISTANCE:
			continue
		var p: Vector2 = world_to_screen(world_pos)
		var accent: Color = place["accent"] as Color
		var s: float = WORLD_ZOOM

		draw_circle(p + Vector2(0.0, 57.0 * s), 70.0 * s, Color(0.01, 0.015, 0.06, 0.26))
		draw_set_transform(p + Vector2(0.0, 25.0 * s), 0.0, Vector2(1.0, 0.44))
		draw_circle(Vector2.ZERO, 105.0 * s, Color("151a3b"))
		draw_set_transform(p, 0.0, Vector2(1.0, 0.44))
		draw_circle(Vector2.ZERO, 108.0 * s, Color("202854"))
		draw_arc(Vector2.ZERO, 108.0 * s, 0.0, TAU, 48, Color(accent, 0.55), 3.0, true)
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

		var decor_x: Array[float] = [-58.0, -29.0, 28.0, 58.0]
		for j: int in range(4):
			var h: float = 22.0 + float((i + j) % 3) * 9.0
			var dx: float = decor_x[j] * s
			draw_rect(Rect2(p.x + dx - 4.0 * s, p.y - h * s, 8.0 * s, h * s), Color("3a4372"))
			draw_circle(Vector2(p.x + dx, p.y - (h + 2.0) * s), (9.0 + float((j + i) % 2) * 4.0) * s, Color(accent, 0.72))

		var portal_center: Vector2 = p + Vector2(0.0, -53.0 * s)
		var pulse: float = 0.98 + sin(elapsed * 1.6 + float(i) * 0.83) * 0.045
		draw_circle(portal_center, 56.0 * s * pulse, Color(accent, 0.08))
		draw_circle(portal_center, 38.0 * s * pulse, Color("0e1535"))
		draw_arc(portal_center, 38.0 * s * pulse, 0.0, TAU, 36, accent, 4.0, true)
		draw_circle(portal_center, 24.0 * s * pulse, Color(accent, 0.20))

		var orbit: float = elapsed * (0.82 + float(i) * 0.012) + float(i) * 0.83
		var orbiter: Vector2 = portal_center + Vector2(cos(orbit), sin(orbit)) * 51.0 * s
		draw_circle(orbiter, 6.0 * s, accent)

		draw_string(fallback_font, p + Vector2(-120.0 * s, 116.0 * s), str(place["name"]), HORIZONTAL_ALIGNMENT_CENTER, 240.0 * s, int(22.0 * s), Color.WHITE)
		draw_string(fallback_font, p + Vector2(-120.0 * s, 140.0 * s), str(place["subtitle"]), HORIZONTAL_ALIGNMENT_CENTER, 240.0 * s, int(13.0 * s), Color("aeb8df"))

func draw_motes() -> void:
	var count: int = BUSY_MOTES if busy else STEADY_MOTES
	var accent: Color = PLACES[selected_index]["accent"] as Color
	for i: int in range(count):
		var phase: float = elapsed * mote_speeds[i] + mote_phases[i]
		var offset: Vector2 = Vector2(cos(phase) * (5.0 + float(i % 5) * 3.0), sin(phase * 0.82) * (8.0 + float(i % 6) * 3.0))
		var alpha: float = 0.16 + float(i % 5) * 0.05
		draw_circle(world_to_screen(mote_origins[i] + offset), 2.1 + float(i % 3) * 0.45, Color(accent, alpha))

func draw_particles() -> void:
	var accent: Color = PLACES[selected_index]["accent"] as Color
	for i: int in range(PARTICLE_POOL):
		if particle_life[i] <= 0.0:
			continue
		var ratio: float = particle_life[i] / max(0.001, particle_max_life[i])
		var p: Vector2 = world_to_screen(particle_positions[i])
		var radius: float = (2.4 + float(i % 3) * 0.7) * ratio
		draw_circle(p, radius, Color(accent, 0.82 * ratio))

func draw_actor() -> void:
	var p: Vector2 = world_to_screen(actor_pos)
	p.y += (-8.0 + sin(elapsed * 2.2) * 6.0) * WORLD_ZOOM
	var s: float = WORLD_ZOOM
	var thruster_pulse: float = 0.88 + (sin(elapsed * 4.3) + 1.0) * 0.06
	var thruster_alpha: float = 0.17 + (sin(elapsed * 5.1) + 1.0) * 0.08

	draw_circle(p + Vector2(0.0, 43.0 * s), 19.0 * s * thruster_pulse, Color(0.36, 0.89, 1.0, thruster_alpha))
	draw_colored_polygon(PackedVector2Array([p + Vector2(-42.0, -2.0) * s, p + Vector2(-20.0, 8.0) * s, p + Vector2(-26.0, 34.0) * s]), Color("4c43b2"))
	draw_colored_polygon(PackedVector2Array([p + Vector2(42.0, -2.0) * s, p + Vector2(20.0, 8.0) * s, p + Vector2(26.0, 34.0) * s]), Color("4c43b2"))

	draw_set_transform(p, 0.0, Vector2(1.0, 1.16))
	draw_circle(Vector2.ZERO, 42.0 * s, Color("6959e8"))
	draw_set_transform(p + Vector2(0.0, -12.0) * s, 0.0, Vector2(1.0, 0.80))
	draw_circle(Vector2.ZERO, 31.0 * s, Color("101733"))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	draw_circle(p + Vector2(-14.0, -15.0) * s, 5.5 * s, Color("d7fbff"))
	draw_circle(p + Vector2(14.0, -15.0) * s, 5.5 * s, Color("d7fbff"))
	var mouth_h: float = (3.0 if busy else 1.4) * s * (0.65 + abs(sin(elapsed * 12.5)) * (1.1 if busy else 0.0))
	draw_rect(Rect2(p.x - 8.0 * s, p.y + 1.0 * s, 16.0 * s, mouth_h), Color("89f3ff"))
	draw_line(p + Vector2(0.0, -49.0) * s, p + Vector2(0.0, -70.0) * s, Color("b0a6ff"), 4.0 * s)
	draw_circle(p + Vector2(0.0, -78.0) * s, 7.0 * s, Color("6eeaf5"))

func create_ui() -> void:
	var layer: CanvasLayer = CanvasLayer.new()
	layer.layer = 100
	add_child(layer)

	var title: Label = Label.new()
	title.text = "KIDSLIVE / ARCHITECTURE SHOOTOUT — GODOT"
	title.position = Vector2(14.0, 34.0)
	title.add_theme_font_size_override("font_size", 10)
	title.add_theme_color_override("font_color", Color("9ba8dc"))
	layer.add_child(title)

	var heading: Label = Label.new()
	heading.text = "Godot Native Candidate"
	heading.position = Vector2(14.0, 52.0)
	heading.add_theme_font_size_override("font_size", 24)
	layer.add_child(heading)

	metrics_label = Label.new()
	metrics_label.position = Vector2(14.0, 88.0)
	metrics_label.size = Vector2(360.0, 48.0)
	metrics_label.add_theme_font_size_override("font_size", 12)
	metrics_label.add_theme_color_override("font_color", Color("dfe5ff"))
	layer.add_child(metrics_label)

	selected_label = Label.new()
	selected_label.position = Vector2(14.0, 137.0)
	selected_label.size = Vector2(360.0, 22.0)
	selected_label.add_theme_font_size_override("font_size", 12)
	selected_label.add_theme_color_override("font_color", Color("aeb8df"))
	layer.add_child(selected_label)

	mode_label = Label.new()
	mode_label.position = Vector2(14.0, 161.0)
	mode_label.size = Vector2(360.0, 22.0)
	mode_label.add_theme_font_size_override("font_size", 11)
	layer.add_child(mode_label)

	var controls: HBoxContainer = HBoxContainer.new()
	controls.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	controls.position = Vector2(10.0, -66.0)
	controls.size = Vector2(-20.0, 56.0)
	controls.add_theme_constant_override("separation", 6)
	layer.add_child(controls)

	add_control_button(controls, "Steady", set_steady)
	add_control_button(controls, "Busy", set_busy)
	add_control_button(controls, "Next", next_world)
	add_control_button(controls, "Reset", reset_metrics)

func add_control_button(parent: HBoxContainer, text: String, callback: Callable) -> void:
	var button: Button = Button.new()
	button.text = text
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.custom_minimum_size = Vector2(78.0, 48.0)
	button.pressed.connect(callback)
	parent.add_child(button)

func set_steady() -> void:
	busy = false
	busy_timer = 0.0
	reseed_motes()
	reset_metrics()
	refresh_mode_label()

func set_busy() -> void:
	busy = true
	busy_timer = 0.0
	reseed_motes()
	emit_particles(42, 1.05)
	reset_metrics()
	refresh_mode_label()

func next_world() -> void:
	visit_world((selected_index + 1) % PLACES.size(), true)

func visit_world(index: int, animate: bool = true) -> void:
	selected_index = index
	var place: Dictionary = PLACES[index]
	var target: Vector2 = place["pos"] as Vector2
	camera_target = target
	actor_target = target + Vector2(126.0, -86.0)
	if not animate:
		camera_pos = camera_target
		actor_pos = actor_target
	selected_label.text = "%s — %s" % [str(place["name"]), str(place["subtitle"])]
	reseed_motes()
	emit_particles(36 if busy else 24, 1.0)
	refresh_mode_label()

func reseed_motes() -> void:
	var place: Dictionary = PLACES[selected_index]
	var center: Vector2 = place["pos"] as Vector2
	var count: int = BUSY_MOTES if busy else STEADY_MOTES
	for i: int in range(count):
		var angle: float = float(i) * 2.399963 + center.x * 0.0007
		var distance: float = 110.0 + float(i % 12) * 36.0
		var origin: Vector2 = center + Vector2(cos(angle) * distance, sin(angle) * distance * 0.68)
		mote_origins[i] = origin

func emit_particles(count: int, energy: float) -> void:
	var center: Vector2 = PLACES[selected_index]["pos"] as Vector2
	var emitted: int = 0
	for i: int in range(PARTICLE_POOL):
		if emitted >= count:
			break
		if particle_life[i] > 0.0:
			continue
		var angle: float = randf_range(-PI, PI)
		var speed: float = randf_range(32.0, 96.0) * energy
		var life: float = randf_range(0.60, 1.05)
		particle_positions[i] = center + Vector2(randf_range(-30.0, 30.0), randf_range(-70.0, -22.0))
		particle_velocities[i] = Vector2(cos(angle) * speed, sin(angle) * speed - 16.0 * energy)
		particle_life[i] = life
		particle_max_life[i] = life
		emitted += 1

func update_particles(delta: float) -> void:
	for i: int in range(PARTICLE_POOL):
		if particle_life[i] <= 0.0:
			continue
		particle_life[i] -= delta
		if particle_life[i] <= 0.0:
			particle_life[i] = 0.0
			continue
		var velocity: Vector2 = particle_velocities[i]
		velocity.y += 20.0 * delta
		particle_velocities[i] = velocity
		particle_positions[i] += velocity * delta

func refresh_metrics() -> void:
	if frame_samples.is_empty():
		return
	var sorted: PackedFloat32Array = frame_samples.duplicate()
	sorted.sort()
	var total_ms: float = 0.0
	var worst_ms: float = 0.0
	var long_frames: int = 0
	for ms: float in frame_samples:
		total_ms += ms
		worst_ms = max(worst_ms, ms)
		if ms > 32.0:
			long_frames += 1
	var avg_ms: float = total_ms / float(frame_samples.size())
	var p99_index: int = min(sorted.size() - 1, int(floor(float(sorted.size()) * 0.99)))
	var p99_ms: float = sorted[p99_index]
	var active_fx: int = 0
	for life: float in particle_life:
		if life > 0.0:
			active_fx += 1
	metrics_label.text = "%d now   %d avg   %d 1%% low\n%.1f avg ms   %.1f worst   %d long   %d FX" % [
		Engine.get_frames_per_second(),
		int(round(1000.0 / max(0.1, avg_ms))),
		int(round(1000.0 / max(0.1, p99_ms))),
		avg_ms,
		worst_ms,
		long_frames,
		active_fx,
	]
	frame_samples.clear()

func reset_metrics() -> void:
	frame_samples.clear()
	metrics_elapsed = 0.0
	metrics_label.text = "sampling…"

func refresh_mode_label() -> void:
	mode_label.text = "BUSY LESSON / native GL" if busy else "PRODUCTION STEADY / native GL"
	mode_label.add_theme_color_override("font_color", Color("ffd166") if busy else Color("7ff0b8"))
