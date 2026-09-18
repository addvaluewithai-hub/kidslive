extends Node

const HABITS := [
	{"id": "water", "label": "Drink water", "subtitle": "Fuel your adventure"},
	{"id": "read", "label": "Read 20 min", "subtitle": "Charge Nova's star map"},
	{"id": "move", "label": "Move your body", "subtitle": "Wake the meadow"},
]
const MAX_SPARKS := 3

var sparks: int = 0
var completed_habits: Dictionary = {}
var player: CharacterBody3D
var player_visual: Node3D
var nova: Node3D
var camera: Camera3D
var sacred_tree: Node3D
var portal_root: Node3D
var portal_ring: MeshInstance3D
var portal_core: MeshInstance3D
var portal_light: OmniLight3D
var portal_ring_material: StandardMaterial3D
var portal_core_material: StandardMaterial3D
var bridge_segments: Array[Node3D] = []
var spark_orbs: Array[Node3D] = []
var habit_buttons: Dictionary = {}
var spark_label: Label
var objective_label: Label
var objective_detail: Label
var nova_bubble: Label
var portal_badge: Label
var capture_pose: bool = false
var elapsed: float = 0.0

func _ready() -> void:
	_build_environment()
	_build_world()
	_build_player()
	_build_nova()
	_build_camera()
	_build_ui()
	_sync_progression(false)

func _process(delta: float) -> void:
	elapsed += delta
	if portal_root != null:
		portal_root.rotation.y = sin(elapsed * 0.55) * 0.08
	if portal_core != null and sparks >= MAX_SPARKS:
		portal_core.rotation.z += delta * 0.55
	for i in range(spark_orbs.size()):
		var orb := spark_orbs[i]
		if orb.visible:
			var angle := elapsed * (0.7 + float(i) * 0.12) + float(i) * 2.1
			orb.position = Vector3(-2.7 + cos(angle) * 1.25, 2.9 + sin(angle * 1.3) * 0.22, -1.55 + sin(angle) * 0.9)
	if nova != null and player != null:
		var target := player.global_position + Vector3(-1.0, 1.72 + sin(elapsed * 2.0) * 0.12, 0.7)
		nova.global_position = nova.global_position.lerp(target, 1.0 - exp(-delta * 4.0))
		nova.rotation.y = sin(elapsed * 1.2) * 0.12
	if camera != null and player != null and not capture_pose:
		var camera_target := player.global_position + Vector3(7.8, 6.7, 9.8)
		camera.global_position = camera.global_position.lerp(camera_target, 1.0 - exp(-delta * 2.4))
		camera.look_at(player.global_position + Vector3(0.5, 0.9, -0.35), Vector3.UP)

func _physics_process(delta: float) -> void:
	if capture_pose or player == null:
		return
	var x_axis := 0.0
	var z_axis := 0.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		x_axis -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		x_axis += 1.0
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		z_axis -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		z_axis += 1.0
	var direction := Vector3(x_axis, 0.0, z_axis)
	if direction.length() > 0.01:
		direction = direction.normalized()
		player.velocity = direction * 3.35
		player.rotation.y = lerp_angle(player.rotation.y, atan2(direction.x, direction.z), 1.0 - exp(-delta * 10.0))
	else:
		player.velocity = player.velocity.move_toward(Vector3.ZERO, delta * 16.0)
	player.move_and_slide()
	player.position.y = 0.34
	player.position.x = clampf(player.position.x, -5.0, 10.0 if sparks >= MAX_SPARKS else 4.6)
	player.position.z = clampf(player.position.z, -4.7, 4.7)

func complete_habit(habit_id: String) -> void:
	if completed_habits.get(habit_id, false):
		return
	completed_habits[habit_id] = true
	sparks = mini(sparks + 1, MAX_SPARKS)
	_sync_progression(true)

func prepare_showcase() -> void:
	capture_pose = true
	for habit in HABITS:
		var habit_data: Dictionary = habit
		completed_habits[habit_data["id"]] = true
	sparks = MAX_SPARKS
	if player != null:
		player.position = Vector3(0.7, 0.34, 1.0)
		player.rotation.y = -0.4
	if camera != null:
		camera.position = Vector3(12.2, 8.4, 13.8)
		camera.look_at(Vector3(1.7, 0.9, -0.6), Vector3.UP)
	_sync_progression(false)

func _build_environment() -> void:
	var environment_node := WorldEnvironment.new()
	var environment := Environment.new()
	var sky := Sky.new()
	var sky_material := ProceduralSkyMaterial.new()
	sky_material.sky_top_color = Color("#132453")
	sky_material.sky_horizon_color = Color("#7565b8")
	sky_material.ground_bottom_color = Color("#14182f")
	sky_material.ground_horizon_color = Color("#4a456f")
	sky_material.sun_angle_max = 18.0
	sky_material.sun_curve = 0.12
	sky.sky_material = sky_material
	environment.background_mode = Environment.BG_SKY
	environment.sky = sky
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	environment.ambient_light_energy = 0.72
	environment.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.tonemap_exposure = 1.12
	environment.fog_enabled = true
	environment.fog_light_color = Color("#55528b")
	environment.fog_light_energy = 0.42
	environment.fog_density = 0.006
	environment_node.environment = environment
	add_child(environment_node)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-52.0, -28.0, 0.0)
	sun.light_color = Color("#ffe0b5")
	sun.light_energy = 1.15
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 45.0
	add_child(sun)

	var fill := OmniLight3D.new()
	fill.position = Vector3(-2.0, 5.2, 2.2)
	fill.light_color = Color("#9f8cff")
	fill.light_energy = 2.0
	fill.omni_range = 11.0
	add_child(fill)

func _build_world() -> void:
	var world := Node3D.new()
	world.name = "World"
	add_child(world)

	_build_main_island(world)
	_build_destination_island(world)
	_build_bridge(world)
	_build_sacred_tree(world)
	_build_portal(world)
	_build_scenery(world)

func _build_main_island(parent: Node3D) -> void:
	var rock_mat := _material(Color("#665675"), 0.95)
	var earth_mat := _material(Color("#8f6a62"), 0.92)
	var grass_mat := _material(Color("#65b77c"), 0.88)
	_cylinder(parent, 5.65, 1.1, Vector3(-0.5, -0.78, 0.0), rock_mat, 5.2)
	_cylinder(parent, 5.35, 0.48, Vector3(-0.5, -0.06, 0.0), earth_mat, 5.05)
	_cylinder(parent, 5.18, 0.2, Vector3(-0.5, 0.24, 0.0), grass_mat, 5.05)
	for i in range(8):
		var angle := TAU * float(i) / 8.0
		var shard := _sphere(parent, 0.5 + float(i % 3) * 0.13, Vector3(-0.5 + cos(angle) * 4.2, -1.45 - float(i % 2) * 0.35, sin(angle) * 4.2), rock_mat)
		shard.scale = Vector3(1.0, 1.35, 0.8)

	for i in range(7):
		var t := float(i) / 6.0
		var x := lerpf(-2.7, 3.7, t)
		var z := 1.9 - sin(t * PI) * 2.0
		var step_mat := _material(Color("#d6c6c1") if i % 2 == 0 else Color("#c7b8b8"), 0.96)
		_cylinder(parent, 0.48, 0.12, Vector3(x, 0.39, z), step_mat, 0.46)

	var pond_mat := _material(Color("#4fa7c9"), 0.28, Color("#5fd5e8"), 0.34)
	var pond := _cylinder(parent, 1.18, 0.06, Vector3(1.2, 0.37, 2.6), pond_mat, 1.05)
	pond.scale.z = 0.72

func _build_destination_island(parent: Node3D) -> void:
	var rock_mat := _material(Color("#554b70"), 0.96)
	var earth_mat := _material(Color("#7e5d6e"), 0.94)
	var grass_mat := _material(Color("#70c789"), 0.88)
	_cylinder(parent, 2.62, 0.95, Vector3(7.7, -0.74, -0.65), rock_mat, 2.35)
	_cylinder(parent, 2.42, 0.42, Vector3(7.7, -0.08, -0.65), earth_mat, 2.25)
	_cylinder(parent, 2.28, 0.18, Vector3(7.7, 0.22, -0.65), grass_mat, 2.22)
	for i in range(4):
		var angle := TAU * float(i) / 4.0 + 0.4
		var rock := _sphere(parent, 0.38, Vector3(7.7 + cos(angle) * 1.8, -1.3, -0.65 + sin(angle) * 1.7), rock_mat)
		rock.scale = Vector3(0.85, 1.5, 0.85)

func _build_bridge(parent: Node3D) -> void:
	var bridge_root := Node3D.new()
	bridge_root.name = "SparkBridge"
	parent.add_child(bridge_root)
	var positions := [Vector3(4.6, 0.45, 0.0), Vector3(5.55, 0.47, -0.18), Vector3(6.5, 0.45, -0.42)]
	for i in range(positions.size()):
		var segment := Node3D.new()
		segment.name = "BridgeSegment%d" % i
		segment.position = positions[i]
		bridge_root.add_child(segment)
		var base_mat := _material(Color("#a987d9"), 0.72, Color("#8d6fe0"), 0.45)
		_box(segment, Vector3(0.82, 0.18, 1.18), Vector3.ZERO, base_mat, -0.18)
		var rune_mat := _material(Color("#ffe08a"), 0.36, Color("#ffd65b"), 1.15)
		_sphere(segment, 0.09, Vector3(0.0, 0.16, 0.0), rune_mat)
		bridge_segments.append(segment)

func _build_sacred_tree(parent: Node3D) -> void:
	sacred_tree = Node3D.new()
	sacred_tree.name = "SparkTree"
	sacred_tree.position = Vector3(-2.7, 0.32, -1.55)
	parent.add_child(sacred_tree)
	var trunk_mat := _material(Color("#825d56"), 0.92)
	var leaf_a := _material(Color("#537f72"), 0.86)
	var leaf_b := _material(Color("#6aa77d"), 0.86)
	_cylinder(sacred_tree, 0.36, 2.45, Vector3(0, 1.22, 0), trunk_mat, 0.26)
	for i in range(7):
		var angle := TAU * float(i) / 7.0
		var radius := 0.92 if i % 2 == 0 else 0.75
		var leaf := _sphere(sacred_tree, radius, Vector3(cos(angle) * 0.78, 2.32 + float(i % 3) * 0.18, sin(angle) * 0.58), leaf_a if i % 2 == 0 else leaf_b)
		leaf.scale = Vector3(1.05, 0.85, 1.0)
	var crown := _sphere(sacred_tree, 1.0, Vector3(0, 2.72, 0), leaf_b)
	crown.scale = Vector3(1.15, 0.88, 1.05)
	for i in range(MAX_SPARKS):
		var orb_mat := _material(Color("#ffe27a"), 0.32, Color("#ffd75a"), 1.8)
		var orb := _sphere(parent, 0.11, Vector3(-2.7, 2.9, -1.55), orb_mat)
		orb.visible = false
		spark_orbs.append(orb)

func _build_portal(parent: Node3D) -> void:
	portal_root = Node3D.new()
	portal_root.name = "StarGate"
	portal_root.position = Vector3(7.7, 0.42, -0.65)
	portal_root.rotation.y = -0.28
	parent.add_child(portal_root)

	portal_ring_material = _material(Color("#75649d"), 0.45, Color("#7e69d8"), 0.22)
	var ring_mesh := TorusMesh.new()
	ring_mesh.inner_radius = 0.92
	ring_mesh.outer_radius = 1.18
	ring_mesh.rings = 48
	ring_mesh.ring_segments = 24
	ring_mesh.material = portal_ring_material
	portal_ring = MeshInstance3D.new()
	portal_ring.mesh = ring_mesh
	portal_ring.position = Vector3(0, 1.45, 0)
	portal_ring.rotation.x = PI * 0.5
	portal_root.add_child(portal_ring)

	portal_core_material = _material(Color("#5f5a86"), 0.25, Color("#8e7cff"), 0.0)
	portal_core_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	portal_core_material.albedo_color.a = 0.58
	var core_mesh := CylinderMesh.new()
	core_mesh.bottom_radius = 0.86
	core_mesh.top_radius = 0.86
	core_mesh.height = 0.055
	core_mesh.radial_segments = 48
	core_mesh.material = portal_core_material
	portal_core = MeshInstance3D.new()
	portal_core.mesh = core_mesh
	portal_core.position = Vector3(0, 1.45, 0.02)
	portal_core.rotation.x = PI * 0.5
	portal_root.add_child(portal_core)

	portal_light = OmniLight3D.new()
	portal_light.position = Vector3(0, 1.45, 0.4)
	portal_light.light_color = Color("#aa95ff")
	portal_light.light_energy = 0.2
	portal_light.omni_range = 4.0
	portal_root.add_child(portal_light)

	var arch_mat := _material(Color("#5b526f"), 0.92)
	_box(portal_root, Vector3(0.34, 2.5, 0.5), Vector3(-1.18, 1.18, 0.12), arch_mat)
	_box(portal_root, Vector3(0.34, 2.5, 0.5), Vector3(1.18, 1.18, 0.12), arch_mat)
	_box(portal_root, Vector3(2.65, 0.32, 0.5), Vector3(0, 2.38, 0.12), arch_mat)

func _build_scenery(parent: Node3D) -> void:
	_build_tree(parent, Vector3(-4.4, 0.34, 1.7), 1.05, Color("#4b856d"))
	_build_tree(parent, Vector3(-3.5, 0.34, 3.3), 0.82, Color("#5d9575"))
	_build_tree(parent, Vector3(2.9, 0.34, -3.15), 0.9, Color("#4f8a6c"))
	_build_tree(parent, Vector3(8.8, 0.32, -1.85), 0.72, Color("#629c75"))
	_build_tree(parent, Vector3(7.1, 0.32, 0.75), 0.65, Color("#6aa67e"))

	var crystal_mat := _material(Color("#f4d16d"), 0.35, Color("#ffd762"), 1.5)
	for pos in [Vector3(-0.9, 0.58, -3.45), Vector3(2.95, 0.58, 1.85), Vector3(-4.05, 0.58, -0.35), Vector3(7.25, 0.55, 1.0)]:
		var crystal := _sphere(parent, 0.16, pos, crystal_mat)
		crystal.scale = Vector3(0.72, 1.65, 0.72)

	for i in range(18):
		var angle := TAU * float(i) / 18.0
		var radius := 3.7 + float(i % 4) * 0.28
		var flower_color := Color("#f39ec0") if i % 3 == 0 else (Color("#ffe09a") if i % 3 == 1 else Color("#bba7ff"))
		_cylinder(parent, 0.025, 0.28, Vector3(-0.5 + cos(angle) * radius, 0.5, sin(angle) * radius), _material(Color("#4f8759"), 0.9), 0.025)
		_sphere(parent, 0.07, Vector3(-0.5 + cos(angle) * radius, 0.67, sin(angle) * radius), _material(flower_color, 0.72))

	var sign_root := Node3D.new()
	sign_root.position = Vector3(2.8, 0.35, 2.65)
	parent.add_child(sign_root)
	var wood := _material(Color("#76574e"), 0.94)
	_box(sign_root, Vector3(0.12, 1.15, 0.12), Vector3(0, 0.55, 0), wood)
	_box(sign_root, Vector3(1.65, 0.72, 0.14), Vector3(0, 1.12, 0), _material(Color("#9b7362"), 0.92), -0.08)

func _build_tree(parent: Node3D, position: Vector3, scale_value: float, leaf_color: Color) -> void:
	var root := Node3D.new()
	root.position = position
	root.scale = Vector3.ONE * scale_value
	parent.add_child(root)
	var trunk_mat := _material(Color("#78574e"), 0.95)
	var leaf_mat := _material(leaf_color, 0.88)
	_cylinder(root, 0.22, 1.75, Vector3(0, 0.88, 0), trunk_mat, 0.18)
	for offset in [Vector3(0, 1.85, 0), Vector3(-0.42, 1.65, 0.08), Vector3(0.42, 1.68, -0.04), Vector3(0.1, 2.15, 0.15)]:
		var leaf := _sphere(root, 0.66, offset, leaf_mat)
		leaf.scale = Vector3(1.0, 0.82, 1.0)

func _build_player() -> void:
	player = CharacterBody3D.new()
	player.name = "KidAvatar"
	player.position = Vector3(-0.4, 0.34, 2.0)
	add_child(player)
	player_visual = Node3D.new()
	player.add_child(player_visual)
	var body_mat := _material(Color("#6d7be7"), 0.72)
	var skin_mat := _material(Color("#f2c5a6"), 0.82)
	var hair_mat := _material(Color("#433446"), 0.92)
	var shoe_mat := _material(Color("#f4d26b"), 0.78)
	_capsule(player_visual, 0.28, 0.94, Vector3(0, 0.68, 0), body_mat)
	_sphere(player_visual, 0.34, Vector3(0, 1.35, 0), skin_mat)
	var hair := _sphere(player_visual, 0.35, Vector3(0, 1.49, -0.04), hair_mat)
	hair.scale = Vector3(1.02, 0.55, 1.02)
	_sphere(player_visual, 0.045, Vector3(-0.12, 1.38, 0.31), _material(Color("#25243a"), 0.7))
	_sphere(player_visual, 0.045, Vector3(0.12, 1.38, 0.31), _material(Color("#25243a"), 0.7))
	_box(player_visual, Vector3(0.18, 0.14, 0.34), Vector3(-0.18, 0.1, 0.02), shoe_mat)
	_box(player_visual, Vector3(0.18, 0.14, 0.34), Vector3(0.18, 0.1, 0.02), shoe_mat)

func _build_nova() -> void:
	nova = Node3D.new()
	nova.name = "Nova"
	nova.position = Vector3(-1.4, 2.0, 2.6)
	add_child(nova)
	var body_mat := _material(Color("#e4ddff"), 0.52, Color("#a998ff"), 0.2)
	var face_mat := _material(Color("#29243f"), 0.62)
	var blush_mat := _material(Color("#f2a9c4"), 0.58)
	var star_mat := _material(Color("#ffe170"), 0.32, Color("#ffd95c"), 1.7)
	var body := _sphere(nova, 0.42, Vector3(0, 0.12, 0), body_mat)
	body.scale = Vector3(0.88, 1.08, 0.84)
	_sphere(nova, 0.055, Vector3(-0.14, 0.18, 0.37), face_mat)
	_sphere(nova, 0.055, Vector3(0.14, 0.18, 0.37), face_mat)
	_sphere(nova, 0.055, Vector3(-0.25, 0.04, 0.34), blush_mat)
	_sphere(nova, 0.055, Vector3(0.25, 0.04, 0.34), blush_mat)
	_capsule(nova, 0.1, 0.42, Vector3(-0.42, 0.0, 0), body_mat, Vector3(0, 0, 0.85))
	_capsule(nova, 0.1, 0.42, Vector3(0.42, 0.0, 0), body_mat, Vector3(0, 0, -0.85))
	_cylinder(nova, 0.022, 0.35, Vector3(0, 0.57, 0), star_mat, 0.022)
	_sphere(nova, 0.095, Vector3(0, 0.78, 0), star_mat)
	var light := OmniLight3D.new()
	light.position = Vector3(0, 0.25, 0.3)
	light.light_color = Color("#b6a8ff")
	light.light_energy = 1.2
	light.omni_range = 2.6
	nova.add_child(light)

func _build_camera() -> void:
	camera = Camera3D.new()
	camera.name = "AdventureCamera"
	camera.position = Vector3(8.2, 7.0, 11.8)
	camera.fov = 47.0
	camera.current = true
	camera.near = 0.1
	camera.far = 80.0
	add_child(camera)
	camera.look_at(Vector3(1.0, 0.8, -0.3), Vector3.UP)

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	layer.name = "HUD"
	add_child(layer)
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	layer.add_child(root)

	var title := _label(root, "STAR MEADOW", Vector2(30, 24), Vector2(300, 32), 15, Color("#bfc1ff"))
	title.add_theme_constant_override("outline_size", 5)
	title.add_theme_color_override("font_outline_color", Color(0.03, 0.04, 0.09, 0.7))
	var main_title := _label(root, "Your Adventure", Vector2(28, 52), Vector2(350, 54), 34, Color("#ffffff"))
	main_title.add_theme_constant_override("outline_size", 7)
	main_title.add_theme_color_override("font_outline_color", Color(0.03, 0.04, 0.09, 0.75))
	_label(root, "Habits power the world around you.", Vector2(30, 100), Vector2(370, 30), 16, Color("#d7d7eb"))

	var spark_panel := _panel(root, Vector2(430, 24), Vector2(360, 90), Color(0.06, 0.07, 0.16, 0.88), Color("#8777da"))
	_label(spark_panel, "WORLD ENERGY", Vector2(20, 14), Vector2(150, 22), 13, Color("#b9b1ed"))
	spark_label = _label(spark_panel, "0 / 3 SPARKS", Vector2(20, 37), Vector2(190, 34), 24, Color("#fff1a8"))
	portal_badge = _label(spark_panel, "GATE ASLEEP", Vector2(208, 27), Vector2(130, 38), 13, Color("#a8a6c6"))
	portal_badge.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	portal_badge.vertical_alignment = VERTICAL_ALIGNMENT_CENTER

	var streak_panel := _panel(root, Vector2(1030, 26), Vector2(220, 72), Color(0.06, 0.07, 0.16, 0.88), Color("#e8ba58"))
	_label(streak_panel, "✦  6 DAY STREAK", Vector2(18, 17), Vector2(184, 34), 20, Color("#ffe6a2"))

	var habit_panel := _panel(root, Vector2(28, 418), Vector2(342, 268), Color(0.045, 0.055, 0.13, 0.93), Color("#7165b6"))
	_label(habit_panel, "Today's power-ups", Vector2(18, 14), Vector2(260, 28), 20, Color("#ffffff"))
	_label(habit_panel, "Complete one → change the meadow", Vector2(18, 42), Vector2(300, 22), 13, Color("#bcbcd5"))
	for i in range(HABITS.size()):
		var habit_data: Dictionary = HABITS[i]
		var button := Button.new()
		button.position = Vector2(16, 74 + i * 58)
		button.size = Vector2(310, 50)
		button.text = "%s\n%s" % [habit_data["label"], habit_data["subtitle"]]
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.add_theme_font_size_override("font_size", 15)
		button.add_theme_color_override("font_color", Color("#f7f6ff"))
		button.add_theme_color_override("font_hover_color", Color("#ffffff"))
		button.add_theme_stylebox_override("normal", _style(Color(0.12, 0.13, 0.27, 0.92), Color("#4e4d7d"), 14, 1))
		button.add_theme_stylebox_override("hover", _style(Color(0.17, 0.16, 0.34, 0.96), Color("#9a85ef"), 14, 2))
		button.add_theme_stylebox_override("pressed", _style(Color(0.22, 0.18, 0.38, 0.98), Color("#e5c768"), 14, 2))
		button.pressed.connect(complete_habit.bind(String(habit_data["id"])))
		habit_panel.add_child(button)
		habit_buttons[String(habit_data["id"])] = button

	var objective_panel := _panel(root, Vector2(420, 590), Vector2(610, 100), Color(0.045, 0.055, 0.13, 0.92), Color("#8172cf"))
	_label(objective_panel, "NEXT ADVENTURE", Vector2(20, 12), Vector2(200, 20), 12, Color("#bcb6ec"))
	objective_label = _label(objective_panel, "Wake the Star Gate", Vector2(20, 34), Vector2(340, 30), 22, Color("#ffffff"))
	objective_detail = _label(objective_panel, "Earn 3 Sparks. Each habit builds the bridge.", Vector2(20, 66), Vector2(470, 22), 14, Color("#cbcbe0"))
	var explore := _label(objective_panel, "WASD / arrows  ·  Explore", Vector2(405, 36), Vector2(180, 34), 13, Color("#ffe6a2"))
	explore.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER

	var bubble_panel := _panel(root, Vector2(846, 110), Vector2(370, 102), Color(0.96, 0.95, 1.0, 0.94), Color("#d8d2ff"))
	_label(bubble_panel, "NOVA", Vector2(18, 12), Vector2(80, 18), 12, Color("#6757a5"))
	nova_bubble = _label(bubble_panel, "Let's wake the meadow. One tiny win at a time ✦", Vector2(18, 33), Vector2(334, 58), 17, Color("#312c52"))
	nova_bubble.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

	var chapter := _panel(root, Vector2(974, 500), Vector2(276, 72), Color(0.06, 0.07, 0.16, 0.88), Color("#7466bd"))
	_label(chapter, "CHAPTER 01", Vector2(16, 10), Vector2(110, 18), 11, Color("#b9b1ed"))
	_label(chapter, "The Sleeping Gate", Vector2(16, 29), Vector2(220, 28), 18, Color("#ffffff"))

func _sync_progression(animated: bool) -> void:
	for i in range(bridge_segments.size()):
		var segment := bridge_segments[i]
		segment.visible = i < sparks
		if segment.visible:
			segment.scale = Vector3.ONE
	for i in range(spark_orbs.size()):
		spark_orbs[i].visible = i < sparks
	if sacred_tree != null:
		var tree_scale := 0.9 + float(sparks) * 0.08
		sacred_tree.scale = Vector3.ONE * tree_scale
	if portal_ring_material != null:
		portal_ring_material.emission_energy_multiplier = 0.24 + float(sparks) * 0.6
		portal_ring_material.albedo_color = Color("#8f7ad9") if sparks < MAX_SPARKS else Color("#cfb2ff")
	if portal_core_material != null:
		portal_core_material.emission_enabled = sparks >= MAX_SPARKS
		portal_core_material.emission = Color("#9c8aff")
		portal_core_material.emission_energy_multiplier = 1.8 if sparks >= MAX_SPARKS else 0.0
		portal_core_material.albedo_color = Color(0.55, 0.47, 0.95, 0.78) if sparks >= MAX_SPARKS else Color(0.32, 0.31, 0.45, 0.42)
	if portal_light != null:
		portal_light.light_energy = 3.0 if sparks >= MAX_SPARKS else 0.3 + float(sparks) * 0.45

	if spark_label != null:
		spark_label.text = "%d / %d SPARKS" % [sparks, MAX_SPARKS]
	if portal_badge != null:
		portal_badge.text = "GATE OPEN" if sparks >= MAX_SPARKS else ("ALMOST AWAKE" if sparks == 2 else "GATE ASLEEP")
		portal_badge.add_theme_color_override("font_color", Color("#ffe697") if sparks >= MAX_SPARKS else Color("#b4b0cf"))
	if objective_label != null and objective_detail != null:
		if sparks >= MAX_SPARKS:
			objective_label.text = "Star Gate unlocked ✦"
			objective_detail.text = "Cross the bridge. The next zone is waiting for you."
		else:
			objective_label.text = "Wake the Star Gate"
			objective_detail.text = "%d more Spark%s. Each habit builds the bridge." % [MAX_SPARKS - sparks, "" if MAX_SPARKS - sparks == 1 else "s"]
	if nova_bubble != null:
		match sparks:
			0:
				nova_bubble.text = "Let's wake the meadow. One tiny win at a time ✦"
			1:
				nova_bubble.text = "Look! The first bridge stone appeared. Keep going ✦"
			2:
				nova_bubble.text = "The gate can hear us. One more Spark!"
			_:
				nova_bubble.text = "You did it! The Star Gate is alive. Adventure unlocked ✦"
	for habit in HABITS:
		var habit_data: Dictionary = habit
		var id := String(habit_data["id"])
		var button := habit_buttons.get(id) as Button
		if button != null:
			var done := bool(completed_habits.get(id, false))
			button.disabled = done
			button.text = ("✓  %s\n   Spark earned" if done else "%s\n%s") % ([habit_data["label"]] if done else [habit_data["label"], habit_data["subtitle"]])
			if done:
				button.add_theme_color_override("font_disabled_color", Color("#a9f0be"))
				button.add_theme_stylebox_override("disabled", _style(Color(0.08, 0.18, 0.18, 0.9), Color("#4ba576"), 14, 1))
	if animated and player != null:
		var tween := create_tween()
		tween.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		if sacred_tree != null:
			tween.tween_property(sacred_tree, "scale", sacred_tree.scale * 1.08, 0.18)
			tween.tween_property(sacred_tree, "scale", sacred_tree.scale, 0.34)

func _material(color: Color, roughness: float = 0.82, emission: Color = Color(0, 0, 0, 1), emission_energy: float = 0.0) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = roughness
	mat.diffuse_mode = BaseMaterial3D.DIFFUSE_TOON
	mat.specular_mode = BaseMaterial3D.SPECULAR_TOON
	if emission_energy > 0.0:
		mat.emission_enabled = true
		mat.emission = emission
		mat.emission_energy_multiplier = emission_energy
	return mat

func _box(parent: Node3D, size: Vector3, position: Vector3, mat: Material, rotation_y: float = 0.0) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	mesh.material = mat
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.position = position
	node.rotation.y = rotation_y
	parent.add_child(node)
	return node

func _sphere(parent: Node3D, radius: float, position: Vector3, mat: Material) -> MeshInstance3D:
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = 18
	mesh.rings = 10
	mesh.material = mat
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.position = position
	parent.add_child(node)
	return node

func _cylinder(parent: Node3D, radius: float, height: float, position: Vector3, mat: Material, top_radius: float = -1.0) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.bottom_radius = radius
	mesh.top_radius = radius if top_radius < 0.0 else top_radius
	mesh.height = height
	mesh.radial_segments = 28
	mesh.material = mat
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.position = position
	parent.add_child(node)
	return node

func _capsule(parent: Node3D, radius: float, height: float, position: Vector3, mat: Material, rotation: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var mesh := CapsuleMesh.new()
	mesh.radius = radius
	mesh.height = height
	mesh.radial_segments = 16
	mesh.rings = 8
	mesh.material = mat
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.position = position
	node.rotation = rotation
	parent.add_child(node)
	return node

func _panel(parent: Control, position: Vector2, panel_size: Vector2, bg: Color, border: Color) -> Panel:
	var panel := Panel.new()
	panel.position = position
	panel.size = panel_size
	panel.add_theme_stylebox_override("panel", _style(bg, border, 18, 1))
	parent.add_child(panel)
	return panel

func _label(parent: Control, text: String, position: Vector2, label_size: Vector2, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.position = position
	label.size = label_size
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	parent.add_child(label)
	return label

func _style(bg: Color, border: Color, radius: int, border_width: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = border
	style.set_border_width_all(border_width)
	style.corner_radius_top_left = radius
	style.corner_radius_top_right = radius
	style.corner_radius_bottom_left = radius
	style.corner_radius_bottom_right = radius
	style.content_margin_left = 14.0
	style.content_margin_right = 14.0
	style.content_margin_top = 7.0
	style.content_margin_bottom = 7.0
	return style
