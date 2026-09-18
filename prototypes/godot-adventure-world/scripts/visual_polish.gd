extends Node

var app: Node
var world: Node3D

func _ready() -> void:
	call_deferred("_apply")

func _apply() -> void:
	app = get_parent()
	world = app.get_node_or_null("World") as Node3D
	if world == null:
		return
	_tune_lighting(app)
	_tune_scale()
	_add_backdrop(world)
	_add_foreground_detail(world)

func _tune_lighting(node: Node) -> void:
	if node is WorldEnvironment:
		var world_environment := node as WorldEnvironment
		var environment := world_environment.environment
		if environment != null:
			environment.ambient_light_energy = 0.48
			environment.tonemap_exposure = 0.92
			environment.fog_density = 0.004
			if environment.sky != null and environment.sky.sky_material is ProceduralSkyMaterial:
				var sky_material := environment.sky.sky_material as ProceduralSkyMaterial
				sky_material.sky_top_color = Color("#111c46")
				sky_material.sky_horizon_color = Color("#5c4f94")
				sky_material.ground_horizon_color = Color("#39375f")
	elif node is DirectionalLight3D:
		var directional := node as DirectionalLight3D
		directional.light_energy = minf(directional.light_energy, 0.82)
		directional.light_color = Color("#ffd7b1")
	elif node is OmniLight3D:
		var omni := node as OmniLight3D
		if not _is_under_portal(omni):
			omni.light_energy = minf(omni.light_energy, 0.9)
	for child in node.get_children():
		_tune_lighting(child)

func _is_under_portal(node: Node) -> bool:
	var current := node.get_parent()
	while current != null:
		if current.name == "StarGate":
			return true
		current = current.get_parent()
	return false

func _tune_scale() -> void:
	var avatar := app.get("player_visual") as Node3D
	if avatar != null:
		avatar.scale = Vector3.ONE * 1.38
	var nova := app.get("nova") as Node3D
	if nova != null:
		nova.scale = Vector3.ONE * 1.32
	var tree := app.get("sacred_tree") as Node3D
	if tree != null:
		tree.scale *= 1.12
	var gate := app.get("portal_root") as Node3D
	if gate != null:
		gate.scale = Vector3.ONE * 1.08

func _add_backdrop(parent: Node3D) -> void:
	var root := Node3D.new()
	root.name = "AdventureBackdrop"
	parent.add_child(root)

	var moon_material := _material(Color("#ddd7ff"), 0.4, Color("#a99cff"), 0.7)
	var moon := _sphere(root, 1.25, Vector3(-7.5, 7.2, -10.5), moon_material)
	moon.scale = Vector3(1.0, 1.0, 0.7)

	var star_material := _material(Color("#ffe6a3"), 0.3, Color("#ffd96e"), 1.5)
	for i in range(28):
		var x := -10.0 + float((i * 47) % 240) / 10.0
		var y := 3.7 + float((i * 31) % 55) / 10.0
		var z := -8.0 - float((i * 19) % 40) / 10.0
		var size := 0.045 + float(i % 4) * 0.012
		_sphere(root, size, Vector3(x, y, z), star_material)

	_add_cloud(root, Vector3(-4.7, 4.8, -7.7), 1.0)
	_add_cloud(root, Vector3(5.8, 5.4, -10.2), 0.78)
	_add_cloud(root, Vector3(11.5, 4.1, -8.5), 0.62)
	_add_distant_island(root, Vector3(-6.8, 2.1, -6.8), 0.78)
	_add_distant_island(root, Vector3(12.0, 2.8, -8.4), 0.58)

func _add_cloud(parent: Node3D, position: Vector3, scale_value: float) -> void:
	var cloud := Node3D.new()
	cloud.position = position
	cloud.scale = Vector3.ONE * scale_value
	parent.add_child(cloud)
	var mat := _material(Color("#8b82ba"), 0.95)
	for offset in [Vector3(-0.65, 0, 0), Vector3(0, 0.18, 0), Vector3(0.65, 0, 0), Vector3(0.18, -0.12, 0.1)]:
		var puff := _sphere(cloud, 0.62, offset, mat)
		puff.scale = Vector3(1.3, 0.65, 0.7)

func _add_distant_island(parent: Node3D, position: Vector3, scale_value: float) -> void:
	var root := Node3D.new()
	root.position = position
	root.scale = Vector3.ONE * scale_value
	parent.add_child(root)
	_cylinder(root, 1.85, 0.65, Vector3(0, -0.3, 0), _material(Color("#554c72"), 0.95), 1.55)
	_cylinder(root, 1.56, 0.15, Vector3(0, 0.08, 0), _material(Color("#5b9a78"), 0.9), 1.5)
	_cylinder(root, 0.16, 1.6, Vector3(0.1, 0.86, 0), _material(Color("#73534d"), 0.95), 0.14)
	var canopy := _sphere(root, 0.75, Vector3(0.1, 1.85, 0), _material(Color("#4f7f70"), 0.9))
	canopy.scale = Vector3(1.15, 0.72, 1.05)

func _add_foreground_detail(parent: Node3D) -> void:
	var grass_material := _material(Color("#4d8d62"), 0.95)
	var accent_material := _material(Color("#c7a9ff"), 0.55, Color("#9d7cff"), 0.45)
	for i in range(22):
		var angle := TAU * float(i) / 22.0 + 0.17
		var radius := 4.3 + float(i % 3) * 0.22
		var x := -0.5 + cos(angle) * radius
		var z := sin(angle) * radius
		var blade := _cylinder(parent, 0.035, 0.34 + float(i % 2) * 0.08, Vector3(x, 0.55, z), grass_material, 0.012)
		blade.rotation.z = 0.18 * sin(angle)
	for pos in [Vector3(-1.8, 0.55, 2.6), Vector3(2.4, 0.58, -2.4), Vector3(3.4, 0.55, 1.4), Vector3(7.8, 0.53, 1.0)]:
		var shard := _sphere(parent, 0.13, pos, accent_material)
		shard.scale = Vector3(0.7, 1.7, 0.7)

func _material(color: Color, roughness: float = 0.85, emission: Color = Color(0, 0, 0, 1), emission_energy: float = 0.0) -> StandardMaterial3D:
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

func _sphere(parent: Node3D, radius: float, position: Vector3, mat: Material) -> MeshInstance3D:
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = 16
	mesh.rings = 9
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
	mesh.radial_segments = 22
	mesh.material = mat
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.position = position
	parent.add_child(node)
	return node
