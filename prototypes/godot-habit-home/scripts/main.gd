extends Node

const ROOM_MIN_X := -3.75
const ROOM_MAX_X := 3.65
const ROOM_MIN_Z := -2.75
const ROOM_MAX_Z := 2.65
const GRID_STEP := 0.5

var state := HabitState.new()
var world_root: Node3D
var camera: Camera3D
var room_buddy: Node3D
var buddy_base_y := 0.0
var placed_items: Dictionary = {}
var selected_item_id := ""
var dragging := false
var drag_pointer := Vector2.ZERO
var placement_grid: MeshInstance3D

var hud: Control
var habit_panel: PanelContainer
var shop_panel: PanelContainer
var coin_label: Label
var streak_label: Label
var heading_label: Label
var hint_label: Label
var selection_bar: PanelContainer
var selection_label: Label
var rotate_button: Button
var reset_button: Button
var habit_buttons: Dictionary = {}
var shop_buttons: Dictionary = {}
var toast: Label
var toast_tween: Tween
var shop_scroll: ScrollContainer
var shop_row: HBoxContainer

var default_positions := {
	"sofa": Vector3(0.55, 0.0, 0.35),
	"lamp": Vector3(3.15, 0.0, 1.6),
	"plant": Vector3(2.85, 0.0, 2.1),
	"desk": Vector3(2.25, 0.0, -1.8),
}

func _ready() -> void:
	_setup_world()
	_build_ui()
	_restore_owned_furniture()
	_refresh_ui()
	get_viewport().size_changed.connect(_layout_ui)
	_layout_ui()

func _process(_delta: float) -> void:
	if room_buddy != null:
		var t := Time.get_ticks_msec() / 1000.0
		room_buddy.position.y = buddy_base_y + sin(t * 2.1) * 0.035
		room_buddy.rotation.y = sin(t * 0.7) * 0.08

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.physical_keycode == KEY_R:
		_rotate_selected()
		get_viewport().set_input_as_handled()
		return

	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			camera.size = max(7.8, camera.size - 0.6)
			return
		if event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			camera.size = min(13.5, camera.size + 0.6)
			return
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				_begin_world_pointer(event.position)
			else:
				_end_world_pointer()
			return
	if event is InputEventMouseMotion and dragging:
		drag_pointer = event.position
		_update_drag_position(drag_pointer)
		return
	if event is InputEventScreenTouch:
		if event.pressed:
			_begin_world_pointer(event.position)
		else:
			_end_world_pointer()
		return
	if event is InputEventScreenDrag and dragging:
		drag_pointer = event.position
		_update_drag_position(drag_pointer)

func _setup_world() -> void:
	world_root = Node3D.new()
	world_root.name = "World"
	add_child(world_root)

	var environment_node := WorldEnvironment.new()
	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color("#0c1022")
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color("#9aa7dc")
	environment.ambient_light_energy = 0.48
	environment.tonemap_mode = Environment.TONE_MAPPER_ACES
	environment.adjustment_enabled = true
	environment.adjustment_contrast = 1.05
	environment.adjustment_saturation = 1.08
	environment_node.environment = environment
	world_root.add_child(environment_node)

	var key_light := DirectionalLight3D.new()
	key_light.rotation_degrees = Vector3(-54, -35, 0)
	key_light.light_color = Color("#fff0d5")
	key_light.light_energy = 1.15
	key_light.shadow_enabled = true
	world_root.add_child(key_light)

	var fill := OmniLight3D.new()
	fill.position = Vector3(-2.4, 3.8, 1.6)
	fill.light_color = Color("#8aa8ff")
	fill.light_energy = 0.85
	fill.omni_range = 7.5
	fill.shadow_enabled = false
	world_root.add_child(fill)

	var warm := OmniLight3D.new()
	warm.position = Vector3(2.6, 2.8, -1.2)
	warm.light_color = Color("#ffd39a")
	warm.light_energy = 0.55
	warm.omni_range = 5.0
	world_root.add_child(warm)

	var built := RoomBuilder.build(world_root)
	room_buddy = built["buddy"]
	buddy_base_y = room_buddy.position.y
	placement_grid = _create_placement_grid()
	world_root.add_child(placement_grid)
	placement_grid.visible = false

	camera = Camera3D.new()
	camera.name = "IsometricCamera"
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 10.7
	camera.position = Vector3(8.8, 8.4, 9.2)
	camera.look_at_from_position(camera.position, Vector3(0.45, 0.65, 0.05), Vector3.UP)
	camera.current = true
	world_root.add_child(camera)

func _create_placement_grid() -> MeshInstance3D:
	var mesh := ImmediateMesh.new()
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color = Color(0.72, 0.78, 1.0, 0.2)
	mesh.surface_begin(Mesh.PRIMITIVE_LINES, mat)
	var x := ROOM_MIN_X
	while x <= ROOM_MAX_X + 0.01:
		mesh.surface_add_vertex(Vector3(x, 0.075, ROOM_MIN_Z))
		mesh.surface_add_vertex(Vector3(x, 0.075, ROOM_MAX_Z))
		x += GRID_STEP
	var z := ROOM_MIN_Z
	while z <= ROOM_MAX_Z + 0.01:
		mesh.surface_add_vertex(Vector3(ROOM_MIN_X, 0.075, z))
		mesh.surface_add_vertex(Vector3(ROOM_MAX_X, 0.075, z))
		z += GRID_STEP
	mesh.surface_end()
	var node := MeshInstance3D.new()
	node.mesh = mesh
	return node

func _restore_owned_furniture() -> void:
	for item in HabitState.SHOP:
		var item_id: String = item["id"]
		if state.owns(item_id):
			_spawn_owned_item(item_id, false)

func _spawn_owned_item(item_id: String, animate := true) -> void:
	if placed_items.has(item_id):
		return
	var node := FurnitureFactory.create(item_id)
	node.name = "Owned_%s" % item_id
	var fallback: Vector3 = default_positions[item_id]
	var saved := state.get_placement(item_id, fallback)
	node.position = Vector3(float(saved["x"]), 0.0, float(saved["z"]))
	node.rotation.y = float(saved["yaw"])
	world_root.add_child(node)
	placed_items[item_id] = node

	if animate:
		var destination := node.position
		node.position.y = 2.0
		node.scale = Vector3(0.2, 0.2, 0.2)
		var tween := create_tween().set_parallel(true)
		tween.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		tween.tween_property(node, "position", destination, 0.6)
		tween.tween_property(node, "scale", Vector3.ONE, 0.56)
		_show_toast("Placed %s ✦ Drag it anywhere." % _shop_label(item_id))

func _begin_world_pointer(pointer: Vector2) -> void:
	var hit_id := _pick_owned_item(pointer)
	if hit_id.is_empty():
		_select_item("")
		return
	_select_item(hit_id)
	dragging = true
	drag_pointer = pointer
	placement_grid.visible = true
	_update_drag_position(pointer)

func _end_world_pointer() -> void:
	if not dragging:
		return
	dragging = false
	placement_grid.visible = false
	if selected_item_id.is_empty() or not placed_items.has(selected_item_id):
		return
	var node: Node3D = placed_items[selected_item_id]
	state.save_placement(selected_item_id, node.position, node.rotation.y)
	_show_toast("Saved · %s" % _shop_label(selected_item_id))

func _pick_owned_item(pointer: Vector2) -> String:
	var nearest_id := ""
	var nearest_distance := 76.0
	for item_id in placed_items:
		var node: Node3D = placed_items[item_id]
		if camera.is_position_behind(node.global_position):
			continue
		var screen := camera.unproject_position(node.global_position + Vector3(0, 0.75, 0))
		var distance := screen.distance_to(pointer)
		if distance < nearest_distance:
			nearest_distance = distance
			nearest_id = item_id
	return nearest_id

func _update_drag_position(pointer: Vector2) -> void:
	if selected_item_id.is_empty() or not placed_items.has(selected_item_id):
		return
	var origin := camera.project_ray_origin(pointer)
	var direction := camera.project_ray_normal(pointer)
	var hit: Variant = Plane(Vector3.UP, 0.0).intersects_ray(origin, direction)
	if hit == null:
		return
	var point: Vector3 = hit
	point.x = snappedf(clamp(point.x, ROOM_MIN_X, ROOM_MAX_X), GRID_STEP)
	point.z = snappedf(clamp(point.z, ROOM_MIN_Z, ROOM_MAX_Z), GRID_STEP)
	point.y = 0.0
	var node: Node3D = placed_items[selected_item_id]
	node.position = point

func _select_item(item_id: String) -> void:
	selected_item_id = item_id
	for id in placed_items:
		var node: Node3D = placed_items[id]
		node.scale = Vector3.ONE * (1.04 if id == item_id else 1.0)
	selection_bar.visible = not item_id.is_empty()
	if not item_id.is_empty():
		selection_label.text = "%s · drag to move" % _shop_label(item_id)

func _rotate_selected() -> void:
	if selected_item_id.is_empty() or not placed_items.has(selected_item_id):
		return
	var node: Node3D = placed_items[selected_item_id]
	var target := node.rotation.y + PI * 0.5
	var tween := create_tween().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(node, "rotation:y", target, 0.28)
	state.save_placement(selected_item_id, node.position, target)

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	hud = Control.new()
	hud.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(hud)

	var title := Label.new()
	title.text = "MY SPACE"
	title.add_theme_font_size_override("font_size", 14)
	title.add_theme_color_override("font_color", Color("#aab7dd"))
	title.position = Vector2(26, 22)
	hud.add_child(title)

	heading_label = Label.new()
	heading_label.text = "Build your life. Build your space."
	heading_label.add_theme_font_size_override("font_size", 25)
	heading_label.add_theme_color_override("font_color", Color("#f7f8ff"))
	heading_label.position = Vector2(26, 43)
	hud.add_child(heading_label)

	coin_label = Label.new()
	coin_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	coin_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	coin_label.add_theme_font_size_override("font_size", 16)
	coin_label.add_theme_color_override("font_color", Color("#2a2940"))
	coin_label.add_theme_stylebox_override("normal", _style(Color("#ffd177"), 18, Color("#ffe6aa"), 1, 8))
	coin_label.size = Vector2(130, 42)
	hud.add_child(coin_label)

	habit_panel = PanelContainer.new()
	habit_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	habit_panel.add_theme_stylebox_override("panel", _style(Color(0.045, 0.06, 0.14, 0.91), 24, Color(0.55, 0.62, 1.0, 0.18), 1, 20))
	hud.add_child(habit_panel)
	var habit_box := VBoxContainer.new()
	habit_box.add_theme_constant_override("separation", 10)
	habit_panel.add_child(habit_box)
	var today := Label.new()
	today.text = "TODAY"
	today.add_theme_font_size_override("font_size", 12)
	today.add_theme_color_override("font_color", Color("#8fa0cd"))
	habit_box.add_child(today)
	var panel_heading := Label.new()
	panel_heading.text = "Tiny wins, real progress."
	panel_heading.add_theme_font_size_override("font_size", 20)
	panel_heading.add_theme_color_override("font_color", Color("#ffffff"))
	habit_box.add_child(panel_heading)
	streak_label = Label.new()
	streak_label.add_theme_font_size_override("font_size", 13)
	streak_label.add_theme_color_override("font_color", Color("#ffd177"))
	habit_box.add_child(streak_label)

	for habit in HabitState.HABITS:
		var habit_id: String = habit["id"]
		var button := Button.new()
		button.custom_minimum_size = Vector2(0, 54)
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.add_theme_font_size_override("font_size", 15)
		button.add_theme_color_override("font_color", Color("#eff3ff"))
		button.add_theme_color_override("font_hover_color", Color.WHITE)
		button.add_theme_stylebox_override("normal", _style(Color("#171e3c"), 15, Color(1, 1, 1, 0.06), 1, 14))
		button.add_theme_stylebox_override("hover", _style(Color("#202a50"), 15, Color("#7788ff"), 1, 14))
		button.add_theme_stylebox_override("pressed", _style(Color("#111735"), 15, Color("#ffd177"), 1, 14))
		button.add_theme_stylebox_override("disabled", _style(Color("#18372f"), 15, Color("#6bd19e"), 1, 14))
		button.pressed.connect(func() -> void: _complete_habit(habit_id))
		habit_buttons[habit_id] = button
		habit_box.add_child(button)

	shop_panel = PanelContainer.new()
	shop_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	shop_panel.add_theme_stylebox_override("panel", _style(Color(0.045, 0.06, 0.14, 0.93), 24, Color(0.55, 0.62, 1.0, 0.18), 1, 18))
	hud.add_child(shop_panel)
	var shop_box := VBoxContainer.new()
	shop_box.add_theme_constant_override("separation", 8)
	shop_panel.add_child(shop_box)
	var shop_header := HBoxContainer.new()
	shop_box.add_child(shop_header)
	var shop_title := Label.new()
	shop_title.text = "SHOP  ·  make the room yours"
	shop_title.add_theme_font_size_override("font_size", 14)
	shop_title.add_theme_color_override("font_color", Color("#d8def4"))
	shop_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	shop_header.add_child(shop_title)
	reset_button = Button.new()
	reset_button.text = "Reset demo"
	reset_button.flat = true
	reset_button.add_theme_font_size_override("font_size", 12)
	reset_button.add_theme_color_override("font_color", Color("#7886ad"))
	reset_button.pressed.connect(_reset_demo)
	shop_header.add_child(reset_button)

	shop_scroll = ScrollContainer.new()
	shop_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	shop_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	shop_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	shop_box.add_child(shop_scroll)
	shop_row = HBoxContainer.new()
	shop_row.add_theme_constant_override("separation", 10)
	shop_scroll.add_child(shop_row)
	for item in HabitState.SHOP:
		var item_id: String = item["id"]
		var button := Button.new()
		button.custom_minimum_size = Vector2(172, 74)
		button.add_theme_font_size_override("font_size", 14)
		button.add_theme_color_override("font_color", Color("#f3f5ff"))
		button.add_theme_color_override("font_disabled_color", Color("#8090bb"))
		button.add_theme_stylebox_override("normal", _style(Color("#151d3b"), 16, Color(1, 1, 1, 0.07), 1, 12))
		button.add_theme_stylebox_override("hover", _style(Color("#25305a"), 16, Color("#8d96ff"), 1, 12))
		button.add_theme_stylebox_override("pressed", _style(Color("#111735"), 16, Color("#ffd177"), 1, 12))
		button.add_theme_stylebox_override("disabled", _style(Color("#10162e"), 16, Color(0.5, 0.55, 0.7, 0.18), 1, 12))
		button.pressed.connect(func() -> void: _buy_item(item_id))
		shop_buttons[item_id] = button
		shop_row.add_child(button)

	selection_bar = PanelContainer.new()
	selection_bar.visible = false
	selection_bar.mouse_filter = Control.MOUSE_FILTER_STOP
	selection_bar.add_theme_stylebox_override("panel", _style(Color(0.07, 0.09, 0.18, 0.94), 16, Color("#ffd177"), 1, 12))
	hud.add_child(selection_bar)
	var selection_row := HBoxContainer.new()
	selection_row.add_theme_constant_override("separation", 12)
	selection_bar.add_child(selection_row)
	selection_label = Label.new()
	selection_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	selection_label.add_theme_font_size_override("font_size", 13)
	selection_label.add_theme_color_override("font_color", Color("#eef2ff"))
	selection_row.add_child(selection_label)
	rotate_button = Button.new()
	rotate_button.text = "↻  Rotate"
	rotate_button.add_theme_stylebox_override("normal", _style(Color("#ffd177"), 12, Color("#ffe5a7"), 1, 9))
	rotate_button.add_theme_color_override("font_color", Color("#2a2940"))
	rotate_button.pressed.connect(_rotate_selected)
	selection_row.add_child(rotate_button)

	hint_label = Label.new()
	hint_label.text = "Drag furniture to move · R / Rotate to turn"
	hint_label.add_theme_font_size_override("font_size", 12)
	hint_label.add_theme_color_override("font_color", Color("#8492ba"))
	hud.add_child(hint_label)

	toast = Label.new()
	toast.visible = false
	toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	toast.add_theme_font_size_override("font_size", 14)
	toast.add_theme_color_override("font_color", Color("#242238"))
	toast.add_theme_stylebox_override("normal", _style(Color("#f8f1dc"), 16, Color("#ffd177"), 1, 12))
	toast.size = Vector2(320, 48)
	hud.add_child(toast)

func _layout_ui() -> void:
	if hud == null:
		return
	var viewport := get_viewport().get_visible_rect().size
	var compact := viewport.x < 760.0
	coin_label.position = Vector2(viewport.x - 154, 20)

	if compact:
		heading_label.text = "Build your space."
		heading_label.add_theme_font_size_override("font_size", 20)
		habit_panel.position = Vector2(12, 78)
		habit_panel.size = Vector2(viewport.x - 24, 258)
		shop_panel.position = Vector2(12, viewport.y - 188)
		shop_panel.size = Vector2(viewport.x - 24, 176)
		selection_bar.position = Vector2(12, viewport.y - 246)
		selection_bar.size = Vector2(viewport.x - 24, 52)
		hint_label.visible = false
		camera.size = 12.4
		camera.look_at_from_position(Vector3(8.8, 8.4, 9.2), Vector3(0.2, 0.72, 0.2), Vector3.UP)
	else:
		heading_label.text = "Build your life. Build your space."
		heading_label.add_theme_font_size_override("font_size", 25)
		habit_panel.position = Vector2(24, 94)
		habit_panel.size = Vector2(304, 348)
		shop_panel.position = Vector2(348, viewport.y - 156)
		shop_panel.size = Vector2(viewport.x - 372, 132)
		selection_bar.position = Vector2(viewport.x - 418, 88)
		selection_bar.size = Vector2(394, 52)
		hint_label.visible = true
		hint_label.position = Vector2(viewport.x - 288, viewport.y - 180)
		camera.size = 10.7
		camera.look_at_from_position(Vector3(8.8, 8.4, 9.2), Vector3(0.55, 0.65, 0.05), Vector3.UP)
	toast.position = Vector2((viewport.x - toast.size.x) * 0.5, 28 if compact else viewport.y - 220)

func _complete_habit(habit_id: String) -> void:
	var reward := state.complete_habit(habit_id)
	if reward <= 0:
		return
	_refresh_ui()
	_show_toast("+%d ✦  Nice. Your space just got closer." % reward)
	_pulse_coin()

func _buy_item(item_id: String) -> void:
	if state.owns(item_id):
		_select_item(item_id)
		_show_toast("Owned · drag %s to move it" % _shop_label(item_id))
		return
	var success := state.purchase(item_id)
	if not success:
		_show_toast("Not enough stars yet · finish a habit")
		return
	_spawn_owned_item(item_id, true)
	_refresh_ui()
	_select_item(item_id)
	_pulse_coin()

func _refresh_ui() -> void:
	coin_label.text = "✦  %d" % state.coins
	streak_label.text = "🔥  %d day streak" % state.streak
	for habit in HabitState.HABITS:
		var habit_id: String = habit["id"]
		var button: Button = habit_buttons[habit_id]
		var complete := state.is_habit_complete(habit_id)
		button.disabled = complete
		button.text = "%s   %s                 %s" % [habit["symbol"], habit["label"], "✓" if complete else "+%d ✦" % int(habit["reward"])]
	for item in HabitState.SHOP:
		var item_id: String = item["id"]
		var button: Button = shop_buttons[item_id]
		if state.owns(item_id):
			button.disabled = false
			button.text = "%s\nOwned · move it" % item["label"]
		else:
			button.disabled = false
			button.text = "%s\n%d ✦" % [item["label"], int(item["price"])]

func _show_toast(message: String) -> void:
	if toast_tween != null and toast_tween.is_valid():
		toast_tween.kill()
	toast.text = message
	toast.visible = true
	toast.modulate.a = 0.0
	toast.position.y -= 8.0
	var base_y := toast.position.y + 8.0
	toast_tween = create_tween()
	toast_tween.tween_property(toast, "modulate:a", 1.0, 0.18)
	toast_tween.parallel().tween_property(toast, "position:y", base_y, 0.22).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	toast_tween.tween_interval(1.65)
	toast_tween.tween_property(toast, "modulate:a", 0.0, 0.22)
	toast_tween.tween_callback(func() -> void: toast.visible = false)

func _pulse_coin() -> void:
	coin_label.pivot_offset = coin_label.size * 0.5
	var tween := create_tween()
	tween.tween_property(coin_label, "scale", Vector2(1.12, 1.12), 0.12).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(coin_label, "scale", Vector2.ONE, 0.16)

func _reset_demo() -> void:
	state.reset_demo()
	for item_id in placed_items.keys():
		var node: Node3D = placed_items[item_id]
		node.queue_free()
	placed_items.clear()
	_select_item("")
	_refresh_ui()
	_show_toast("Demo reset · start building again")

func _shop_label(item_id: String) -> String:
	for item in HabitState.SHOP:
		if item["id"] == item_id:
			return item["label"]
	return item_id.capitalize()

func _style(bg: Color, radius: int, border := Color.TRANSPARENT, border_width := 0, padding := 0) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = bg
	box.corner_radius_top_left = radius
	box.corner_radius_top_right = radius
	box.corner_radius_bottom_left = radius
	box.corner_radius_bottom_right = radius
	box.border_width_left = border_width
	box.border_width_right = border_width
	box.border_width_top = border_width
	box.border_width_bottom = border_width
	box.border_color = border
	box.content_margin_left = padding
	box.content_margin_right = padding
	box.content_margin_top = padding
	box.content_margin_bottom = padding
	box.shadow_color = Color(0, 0, 0, 0.2)
	box.shadow_size = 8
	return box
