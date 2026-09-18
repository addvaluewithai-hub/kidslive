extends Node

var app: Node
var world: Node3D
var viewport_connected := false

func _ready() -> void:
	call_deferred("_apply")

func _apply() -> void:
	app = get_parent()
	world = app.get_node_or_null("World") as Node3D
	if world == null:
		return

	# Keep first-time furniture drops intentional and away from the room buddy.
	app.default_positions["sofa"] = Vector3(0.55, 0.0, 0.25)
	app.default_positions["lamp"] = Vector3(-1.55, 0.0, 1.72)
	app.default_positions["plant"] = Vector3(3.08, 0.0, 1.72)
	app.default_positions["desk"] = Vector3(2.25, 0.0, -1.78)
	if app.room_buddy != null:
		app.room_buddy.position = Vector3(1.55, 0.0, 1.82)
		app.buddy_base_y = 0.0

	_tune_tree(world)
	_tune_camera()
	_refresh_copy()

	if not world.child_entered_tree.is_connected(_on_world_child_entered):
		world.child_entered_tree.connect(_on_world_child_entered)
	if not viewport_connected:
		get_viewport().size_changed.connect(_retune_after_layout)
		viewport_connected = true
	if not app.state.habits_changed.is_connected(_refresh_copy_deferred):
		app.state.habits_changed.connect(_refresh_copy_deferred)
	if not app.state.inventory_changed.is_connected(_refresh_copy_deferred):
		app.state.inventory_changed.connect(_refresh_copy_deferred)

func _on_world_child_entered(node: Node) -> void:
	call_deferred("_tune_tree", node)

func _retune_after_layout() -> void:
	call_deferred("_tune_camera")

func _refresh_copy_deferred() -> void:
	call_deferred("_refresh_copy")

func _tune_camera() -> void:
	if app == null or app.camera == null:
		return
	var viewport: Vector2 = get_viewport().get_visible_rect().size
	var compact: bool = viewport.x < 760.0
	if compact:
		app.camera.size = 11.6
		app.camera.look_at_from_position(Vector3(8.9, 8.0, 9.6), Vector3(0.55, 0.72, 0.15), Vector3.UP)
	else:
		app.camera.size = 9.65
		# Shift the room to the right so UI and world read as one deliberate composition.
		app.camera.look_at_from_position(Vector3(8.9, 7.7, 9.8), Vector3(0.72, 0.68, 0.08), Vector3.UP)

func _tune_tree(node: Node) -> void:
	if node is WorldEnvironment:
		var environment: Environment = (node as WorldEnvironment).environment
		if environment != null:
			environment.ambient_light_energy = 0.24
			environment.adjustment_contrast = 1.02
			environment.adjustment_saturation = 1.04
	elif node is DirectionalLight3D:
		var directional: DirectionalLight3D = node as DirectionalLight3D
		directional.light_energy = minf(directional.light_energy, 0.66)
		directional.light_color = Color("#ffe9d2")
	elif node is OmniLight3D:
		var omni: OmniLight3D = node as OmniLight3D
		omni.light_energy = minf(omni.light_energy, 0.62)
		omni.omni_range = minf(omni.omni_range, 5.4)
	elif node is MeshInstance3D:
		_tune_mesh(node as MeshInstance3D)

	for child: Node in node.get_children():
		_tune_tree(child)

func _tune_mesh(mesh_instance: MeshInstance3D) -> void:
	if mesh_instance.mesh == null:
		return
	var mat: Material = mesh_instance.mesh.material
	if not mat is StandardMaterial3D:
		return
	var standard: StandardMaterial3D = mat as StandardMaterial3D
	standard.roughness = maxf(standard.roughness, 0.82)
	var c: Color = standard.albedo_color
	var peak: float = maxf(c.r, maxf(c.g, c.b))
	if peak > 0.86:
		var factor: float = 0.86 / peak
		standard.albedo_color = Color(c.r * factor, c.g * factor, c.b * factor, c.a)
	if standard.emission_enabled:
		standard.emission_energy_multiplier = minf(standard.emission_energy_multiplier, 0.9)

func _refresh_copy() -> void:
	if app == null:
		return
	if app.streak_label != null:
		app.streak_label.text = "✦  %d DAY STREAK" % app.state.streak
	for habit: Dictionary in HabitState.HABITS:
		var habit_id: String = str(habit["id"])
		var button: Button = app.habit_buttons.get(habit_id) as Button
		if button == null:
			continue
		var complete: bool = app.state.is_habit_complete(habit_id)
		var mark: String = "DONE" if complete else "+%d ✦" % int(habit["reward"])
		button.text = "%s                                  %s" % [str(habit["label"]), mark]
