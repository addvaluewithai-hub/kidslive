extends Node2D

const STEADY_MOTES := 36
const BUSY_MOTES := 72
const PARTICLE_POOL := 96
const WORLD_CULL_DISTANCE := 720.0

const PLACES := [
	{"id": "english", "name": "English Grove", "subtitle": "Stories & words", "pos": Vector2(220, 210), "accent": Color("73ddff")},
	{"id": "german", "name": "German Harbor", "subtitle": "Tiny missions", "pos": Vector2(600, 165), "accent": Color("8fa7ff")},
	{"id": "chess", "name": "Chess Citadel", "subtitle": "Think ahead", "pos": Vector2(950, 300), "accent": Color("ffd166")},
	{"id": "knowledge", "name": "Knowledge Observatory", "subtitle": "How do we know?", "pos": Vector2(860, 650), "accent": Color("d493ff")},
	{"id": "habits", "name": "Habits Garden", "subtitle": "Tiny wins", "pos": Vector2(505, 720), "accent": Color("7ff0b8")},
	{"id": "lab", "name": "Curiosity Lab", "subtitle": "Try & discover", "pos": Vector2(160, 590), "accent": Color("ff8fb9")},
]

var camera: Camera2D
var actor: Node2D
var actor_visual: Node2D
var actor_mouth: Polygon2D
var actor_thruster: Polygon2D
var world_nodes: Array[Node2D] = []
var portal_nodes: Array[Node2D] = []
var orbiter_nodes: Array[Polygon2D] = []
var motes: Array[Polygon2D] = []
var mote_origins: Array[Vector2] = []
var particles: Array = []

var selected_index := 0
var busy := false
var busy_timer := 0.0
var elapsed := 0.0
var metrics_elapsed := 0.0
var frame_samples: Array[float] = []
var metrics_label: Label
var mode_label: Label
var selected_label: Label

func _ready() -> void:
	create_backdrop()
	create_routes()
	for i in range(PLACES.size()):
		create_world(i)
	create_motes()
	create_particles()
	create_actor()
	create_camera()
	create_ui()
	visit_world(0, false)

func _process(delta: float) -> void:
	elapsed += delta
	update_actor()
	update_worlds()
	update_motes()
	update_particles(delta)
	update_culling()

	if busy:
		busy_timer += delta
		if busy_timer >= 0.18:
			busy_timer = 0.0
			emit_particles(5, 0.72)

	frame_samples.append(delta * 1000.0)
	metrics_elapsed += delta
	if metrics_elapsed >= 1.0:
		metrics_elapsed = 0.0
		refresh_metrics()

func create_camera() -> void:
	camera = Camera2D.new()
	camera.enabled = true
	camera.position = PLACES[0]["pos"]
	camera.zoom = Vector2(0.84, 0.84)
	add_child(camera)

func create_backdrop() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 20260908

	for nebula in [
		{"pos": Vector2(330, 260), "radius": 330.0, "color": Color(0.39, 0.28, 0.78, 0.11)},
		{"pos": Vector2(850, 590), "radius": 390.0, "color": Color(0.11, 0.62, 0.72, 0.09)},
		{"pos": Vector2(760, 120), "radius": 260.0, "color": Color(0.72, 0.24, 0.59, 0.07)},
	]:
		var p := Polygon2D.new()
		p.polygon = ellipse_points(nebula["radius"], nebula["radius"] * 0.72, 40)
		p.color = nebula["color"]
		p.position = nebula["pos"]
		p.z_index = -20
		add_child(p)

	for i in range(120):
		var star := Polygon2D.new()
		var r := rng.randf_range(0.8, 2.4)
		star.polygon = circle_points(r, 8)
		star.color = Color(1, 1, 1, rng.randf_range(0.15, 0.55))
		star.position = Vector2(rng.randf_range(-100, 1220), rng.randf_range(-80, 920))
		star.z_index = -15
		add_child(star)

func create_routes() -> void:
	var route := Line2D.new()
	route.width = 4.0
	route.default_color = Color(0.5, 0.6, 1.0, 0.11)
	var pts := PackedVector2Array()
	for place in PLACES:
		pts.append(place["pos"])
	pts.append(PLACES[0]["pos"])
	route.points = pts
	route.z_index = -5
	add_child(route)

func create_world(index: int) -> void:
	var place: Dictionary = PLACES[index]
	var root := Node2D.new()
	root.position = place["pos"]
	root.z_index = 5
	add_child(root)
	world_nodes.append(root)

	var shadow := Polygon2D.new()
	shadow.polygon = ellipse_points(108, 27, 30)
	shadow.color = Color(0.01, 0.015, 0.06, 0.42)
	shadow.position = Vector2(0, 65)
	root.add_child(shadow)

	var underside := Polygon2D.new()
	underside.polygon = ellipse_points(95, 48, 30)
	underside.color = Color("151a3b")
	underside.position = Vector2(0, 36)
	root.add_child(underside)

	var ground := Polygon2D.new()
	ground.polygon = ellipse_points(108, 48, 32)
	ground.color = Color("202854")
	ground.position = Vector2(0, 5)
	root.add_child(ground)

	var rim := Line2D.new()
	rim.width = 3.0
	rim.default_color = Color(place["accent"], 0.56)
	rim.points = closed_points(ellipse_points(108, 48, 32))
	rim.position = Vector2(0, 5)
	root.add_child(rim)

	for j in range(4):
		var x_values := [-58.0, -29.0, 28.0, 58.0]
		var x: float = x_values[j]
		var h := 22.0 + float((index + j) % 3) * 9.0
		var stem := Polygon2D.new()
		stem.polygon = PackedVector2Array([Vector2(-4, 0), Vector2(4, 0), Vector2(4, -h), Vector2(-4, -h)])
		stem.color = Color("3a4372")
		stem.position = Vector2(x, 4)
		root.add_child(stem)

		var crown := Polygon2D.new()
		crown.polygon = circle_points(9.0 + float((j + index) % 2) * 4.0, 16)
		crown.color = Color(place["accent"], 0.72)
		crown.position = Vector2(x, 2 - h)
		root.add_child(crown)

	var portal := Node2D.new()
	portal.position = Vector2(0, -53)
	root.add_child(portal)
	portal_nodes.append(portal)

	var halo := Polygon2D.new()
	halo.polygon = circle_points(56, 32)
	halo.color = Color(place["accent"], 0.08)
	portal.add_child(halo)

	var core := Polygon2D.new()
	core.polygon = circle_points(38, 32)
	core.color = Color("0e1535")
	portal.add_child(core)

	var ring := Line2D.new()
	ring.width = 4.0
	ring.default_color = Color(place["accent"], 0.95)
	ring.points = closed_points(circle_points(38, 32))
	portal.add_child(ring)

	var inner := Polygon2D.new()
	inner.polygon = circle_points(24, 24)
	inner.color = Color(place["accent"], 0.20)
	portal.add_child(inner)

	var orbiter := Polygon2D.new()
	orbiter.polygon = diamond_points(7)
	orbiter.color = Color(place["accent"], 0.95)
	root.add_child(orbiter)
	orbiter_nodes.append(orbiter)

	var title := Label.new()
	title.text = place["name"]
	title.position = Vector2(-130, 98)
	title.size = Vector2(260, 30)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", Color.WHITE)
	root.add_child(title)

	var subtitle := Label.new()
	subtitle.text = place["subtitle"]
	subtitle.position = Vector2(-130, 127)
	subtitle.size = Vector2(260, 22)
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.add_theme_font_size_override("font_size", 13)
	subtitle.add_theme_color_override("font_color", Color("aeb8df"))
	root.add_child(subtitle)

func create_motes() -> void:
	for i in range(BUSY_MOTES):
		var mote := Polygon2D.new()
		mote.polygon = circle_points(2.6 + float(i % 3) * 0.45, 8)
		mote.visible = i < STEADY_MOTES
		mote.z_index = 2
		add_child(mote)
		motes.append(mote)
		mote_origins.append(Vector2.ZERO)

func create_particles() -> void:
	for i in range(PARTICLE_POOL):
		var p := Polygon2D.new()
		p.polygon = diamond_points(3.2 + float(i % 3) * 0.7) if i % 3 == 0 else circle_points(2.5 + float(i % 2), 8)
		p.visible = false
		p.z_index = 24
		add_child(p)
		particles.append({"node": p, "active": false, "velocity": Vector2.ZERO, "life": 0.0, "max_life": 0.0})

func create_actor() -> void:
	actor = Node2D.new()
	actor.z_index = 40
	add_child(actor)
	actor_visual = Node2D.new()
	actor.add_child(actor_visual)

	actor_thruster = Polygon2D.new()
	actor_thruster.polygon = ellipse_points(22, 16, 20)
	actor_thruster.color = Color(0.36, 0.89, 1.0, 0.22)
	actor_thruster.position = Vector2(0, 45)
	actor_visual.add_child(actor_thruster)

	var left_fin := Polygon2D.new()
	left_fin.polygon = PackedVector2Array([Vector2(-42, -2), Vector2(-20, 8), Vector2(-26, 34)])
	left_fin.color = Color("4c43b2")
	actor_visual.add_child(left_fin)

	var right_fin := Polygon2D.new()
	right_fin.polygon = PackedVector2Array([Vector2(42, -2), Vector2(20, 8), Vector2(26, 34)])
	right_fin.color = Color("4c43b2")
	actor_visual.add_child(right_fin)

	var body := Polygon2D.new()
	body.polygon = ellipse_points(42, 49, 32)
	body.color = Color("6959e8")
	actor_visual.add_child(body)

	var face := Polygon2D.new()
	face.polygon = ellipse_points(31, 25, 30)
	face.color = Color("101733")
	face.position = Vector2(0, -12)
	actor_visual.add_child(face)

	for eye_x in [-14.0, 14.0]:
		var eye := Polygon2D.new()
		eye.polygon = circle_points(5.5, 16)
		eye.color = Color("d7fbff")
		eye.position = Vector2(eye_x, -15)
		actor_visual.add_child(eye)

	actor_mouth = Polygon2D.new()
	actor_mouth.polygon = PackedVector2Array([Vector2(-8, -2), Vector2(8, -2), Vector2(8, 2), Vector2(-8, 2)])
	actor_mouth.color = Color("89f3ff")
	actor_mouth.position = Vector2(0, 3)
	actor_visual.add_child(actor_mouth)

	var antenna := Line2D.new()
	antenna.width = 4.0
	antenna.default_color = Color("b0a6ff")
	antenna.points = PackedVector2Array([Vector2(0, -49), Vector2(0, -70)])
	actor_visual.add_child(antenna)

	var glow := Polygon2D.new()
	glow.polygon = circle_points(7, 16)
	glow.color = Color("6eeaf5")
	glow.position = Vector2(0, -78)
	actor_visual.add_child(glow)

func create_ui() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 100
	add_child(layer)

	var title := Label.new()
	title.text = "KIDSLIVE / ARCHITECTURE SHOOTOUT — GODOT"
	title.position = Vector2(14, 14)
	title.add_theme_font_size_override("font_size", 12)
	title.add_theme_color_override("font_color", Color("9ba8dc"))
	layer.add_child(title)

	var heading := Label.new()
	heading.text = "Godot Native Candidate"
	heading.position = Vector2(14, 34)
	heading.add_theme_font_size_override("font_size", 24)
	layer.add_child(heading)

	metrics_label = Label.new()
	metrics_label.position = Vector2(14, 68)
	metrics_label.size = Vector2(360, 64)
	metrics_label.add_theme_font_size_override("font_size", 12)
	metrics_label.add_theme_color_override("font_color", Color("dfe5ff"))
	layer.add_child(metrics_label)

	selected_label = Label.new()
	selected_label.position = Vector2(14, 132)
	selected_label.size = Vector2(360, 24)
	selected_label.add_theme_font_size_override("font_size", 13)
	selected_label.add_theme_color_override("font_color", Color("9ba8dc"))
	layer.add_child(selected_label)

	mode_label = Label.new()
	mode_label.position = Vector2(14, 158)
	mode_label.size = Vector2(360, 24)
	mode_label.add_theme_font_size_override("font_size", 12)
	mode_label.add_theme_color_override("font_color", Color("7ff0b8"))
	layer.add_child(mode_label)

	var controls := HBoxContainer.new()
	controls.position = Vector2(10, 770)
	controls.size = Vector2(370, 58)
	controls.add_theme_constant_override("separation", 6)
	layer.add_child(controls)

	var steady_btn := Button.new()
	steady_btn.text = "Steady"
	steady_btn.custom_minimum_size = Vector2(82, 48)
	steady_btn.pressed.connect(set_steady)
	controls.add_child(steady_btn)

	var busy_btn := Button.new()
	busy_btn.text = "Busy"
	busy_btn.custom_minimum_size = Vector2(82, 48)
	busy_btn.pressed.connect(set_busy)
	controls.add_child(busy_btn)

	var next_btn := Button.new()
	next_btn.text = "Next"
	next_btn.custom_minimum_size = Vector2(82, 48)
	next_btn.pressed.connect(next_world)
	controls.add_child(next_btn)

	var reset_btn := Button.new()
	reset_btn.text = "Reset"
	reset_btn.custom_minimum_size = Vector2(82, 48)
	reset_btn.pressed.connect(reset_metrics)
	controls.add_child(reset_btn)

func set_steady() -> void:
	busy = false
	busy_timer = 0.0
	for i in range(motes.size()):
		motes[i].visible = i < STEADY_MOTES
	reseed_motes()
	reset_metrics()
	refresh_mode_label()

func set_busy() -> void:
	busy = true
	busy_timer = 0.0
	for mote in motes:
		mote.visible = true
	reseed_motes()
	emit_particles(42, 1.05)
	reset_metrics()
	refresh_mode_label()

func next_world() -> void:
	visit_world((selected_index + 1) % PLACES.size(), true)

func visit_world(index: int, animate := true) -> void:
	selected_index = index
	var place: Dictionary = PLACES[index]
	selected_label.text = "%s — %s" % [place["name"], place["subtitle"]]

	if animate:
		var tween := create_tween().set_parallel(true)
		tween.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		tween.tween_property(camera, "position", place["pos"], 0.9)
		tween.tween_property(actor, "position", place["pos"] + Vector2(126, -86), 0.9)
	else:
		camera.position = place["pos"]
		actor.position = place["pos"] + Vector2(126, -86)

	reseed_motes()
	emit_particles(36 if busy else 24, 1.0)

func reseed_motes() -> void:
	var place: Dictionary = PLACES[selected_index]
	var count := BUSY_MOTES if busy else STEADY_MOTES
	for i in range(count):
		var angle := float(i) * 2.399963 + place["pos"].x * 0.0007
		var distance := 110.0 + float(i % 12) * 36.0
		var origin := place["pos"] + Vector2(cos(angle) * distance, sin(angle) * distance * 0.68)
		mote_origins[i] = origin
		motes[i].position = origin
		motes[i].color = Color(place["accent"], 0.16 + float(i % 5) * 0.05)

func update_motes() -> void:
	var count := BUSY_MOTES if busy else STEADY_MOTES
	for i in range(count):
		var phase := elapsed * (0.38 + float(i % 7) * 0.07) + float(i) * 0.71
		motes[i].position = mote_origins[i] + Vector2(cos(phase) * (5 + i % 5 * 3), sin(phase * 0.82) * (8 + i % 6 * 3))

func update_actor() -> void:
	actor_visual.position.y = -8.0 + sin(elapsed * 2.2) * 6.0
	actor_thruster.scale = Vector2.ONE * (0.88 + (sin(elapsed * 4.3) + 1.0) * 0.06)
	actor_thruster.color.a = 0.17 + (sin(elapsed * 5.1) + 1.0) * 0.08
	actor_mouth.scale.y = 0.65 + abs(sin(elapsed * 12.5)) * 1.7 if busy else 0.65

func update_worlds() -> void:
	for i in range(world_nodes.size()):
		if not world_nodes[i].visible:
			continue
		var phase := elapsed * 1.6 + float(i) * 0.83
		var scale_value := 0.98 + sin(phase) * 0.045
		portal_nodes[i].scale = Vector2.ONE * scale_value
		var orbit := elapsed * (0.82 + float(i) * 0.012) + float(i) * 0.83
		orbiter_nodes[i].position = Vector2(cos(orbit) * 51.0, -53.0 + sin(orbit) * 51.0)

func update_culling() -> void:
	if camera == null:
		return
	for i in range(world_nodes.size()):
		world_nodes[i].visible = world_nodes[i].position.distance_to(camera.position) <= WORLD_CULL_DISTANCE

func emit_particles(count: int, energy: float) -> void:
	var place: Dictionary = PLACES[selected_index]
	var emitted := 0
	for i in range(particles.size()):
		if emitted >= count:
			break
		var state: Dictionary = particles[i]
		if state["active"]:
			continue
		var node: Polygon2D = state["node"]
		var angle := randf_range(-PI, PI)
		var speed := randf_range(32.0, 96.0) * energy
		var life := randf_range(0.6, 1.05)
		state["active"] = true
		state["velocity"] = Vector2(cos(angle) * speed, sin(angle) * speed - 16.0 * energy)
		state["life"] = life
		state["max_life"] = life
		node.position = place["pos"] + Vector2(randf_range(-30, 30), randf_range(-70, -22))
		node.color = Color(place["accent"], randf_range(0.42, 0.9))
		node.scale = Vector2.ONE * randf_range(0.65, 1.2)
		node.rotation = randf_range(-PI, PI)
		node.visible = true
		emitted += 1

func update_particles(delta: float) -> void:
	for i in range(particles.size()):
		var state: Dictionary = particles[i]
		if not state["active"]:
			continue
		var node: Polygon2D = state["node"]
		state["life"] -= delta
		if state["life"] <= 0.0:
			state["active"] = false
			node.visible = false
			continue
		var velocity: Vector2 = state["velocity"]
		velocity.y += 20.0 * delta
		state["velocity"] = velocity
		node.position += velocity * delta
		node.rotation += delta * 1.5
		node.color.a = max(0.0, state["life"] / state["max_life"])

func refresh_metrics() -> void:
	if frame_samples.is_empty():
		return
	var sorted := frame_samples.duplicate()
	sorted.sort()
	var sum := 0.0
	var worst := 0.0
	var long_frames := 0
	for ms in frame_samples:
		sum += ms
		worst = max(worst, ms)
		if ms > 32.0:
			long_frames += 1
	var avg_ms := sum / float(frame_samples.size())
	var p99_index := min(sorted.size() - 1, int(floor(float(sorted.size()) * 0.99)))
	var p99_ms: float = sorted[p99_index]
	var active_fx := 0
	for state in particles:
		if state["active"]:
			active_fx += 1
	metrics_label.text = "%d now   %d avg   %d 1%% low\n%.1f avg ms   %.1f worst   %d long   %d FX" % [
		Engine.get_frames_per_second(),
		int(round(1000.0 / avg_ms)),
		int(round(1000.0 / p99_ms)),
		avg_ms,
		worst,
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

func circle_points(radius: float, count: int) -> PackedVector2Array:
	return ellipse_points(radius, radius, count)

func ellipse_points(rx: float, ry: float, count: int) -> PackedVector2Array:
	var points := PackedVector2Array()
	for i in range(count):
		var angle := TAU * float(i) / float(count)
		points.append(Vector2(cos(angle) * rx, sin(angle) * ry))
	return points

func closed_points(points: PackedVector2Array) -> PackedVector2Array:
	var result := points.duplicate()
	if not result.is_empty():
		result.append(result[0])
	return result

func diamond_points(radius: float) -> PackedVector2Array:
	return PackedVector2Array([Vector2(0, -radius), Vector2(radius, 0), Vector2(0, radius), Vector2(-radius, 0)])
