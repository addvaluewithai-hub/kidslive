class_name FurnitureFactory
extends RefCounted

const IVORY := Color("#f6f0e7")
const INK := Color("#20243b")
const PLUM := Color("#8b6fd8")
const LILAC := Color("#bba9f6")
const ROSE := Color("#f08fa8")
const SKY := Color("#87c7ff")
const MINT := Color("#7fd3a8")
const GOLD := Color("#ffd177")
const WOOD := Color("#9a705a")
const DARK_WOOD := Color("#63493e")

static func material(color: Color, roughness := 0.78, emission := Color(0, 0, 0, 1), emission_energy := 0.0) -> StandardMaterial3D:
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

static func glass_material(color: Color) -> StandardMaterial3D:
	var mat := material(color, 0.25)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color.a = 0.44
	mat.metallic = 0.08
	return mat

static func box(parent: Node3D, size: Vector3, position: Vector3, color: Color, rotation_y := 0.0, mat: Material = null) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	mesh.material = mat if mat != null else material(color)
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.position = position
	node.rotation.y = rotation_y
	parent.add_child(node)
	return node

static func sphere(parent: Node3D, radius: float, position: Vector3, color: Color, mat: Material = null) -> MeshInstance3D:
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = 20
	mesh.rings = 12
	mesh.material = mat if mat != null else material(color)
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.position = position
	parent.add_child(node)
	return node

static func cylinder(parent: Node3D, radius: float, height: float, position: Vector3, color: Color, top_radius := -1.0) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.bottom_radius = radius
	mesh.top_radius = radius if top_radius < 0.0 else top_radius
	mesh.height = height
	mesh.radial_segments = 20
	mesh.material = material(color)
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.position = position
	parent.add_child(node)
	return node

static func capsule(parent: Node3D, radius: float, height: float, position: Vector3, color: Color, rotation := Vector3.ZERO) -> MeshInstance3D:
	var mesh := CapsuleMesh.new()
	mesh.radius = radius
	mesh.height = height
	mesh.radial_segments = 18
	mesh.rings = 8
	mesh.material = material(color)
	var node := MeshInstance3D.new()
	node.mesh = mesh
	node.position = position
	node.rotation = rotation
	parent.add_child(node)
	return node

static func create(kind: String) -> Node3D:
	var root := Node3D.new()
	root.name = kind.capitalize()
	root.set_meta("kind", kind)
	match kind:
		"sofa":
			_build_sofa(root)
		"lamp":
			_build_lamp(root)
		"plant":
			_build_plant(root)
		"desk":
			_build_desk(root)
		_:
			box(root, Vector3(1.2, 0.8, 1.0), Vector3(0, 0.4, 0), LILAC)
	return root

static func create_bed() -> Node3D:
	var root := Node3D.new()
	box(root, Vector3(2.55, 0.28, 1.55), Vector3(0, 0.16, 0), DARK_WOOD)
	box(root, Vector3(2.4, 0.34, 1.42), Vector3(0, 0.39, 0), IVORY)
	box(root, Vector3(2.25, 0.12, 1.18), Vector3(0.08, 0.59, 0.08), ROSE)
	box(root, Vector3(2.55, 1.0, 0.16), Vector3(0, 0.64, -0.76), DARK_WOOD)
	box(root, Vector3(0.8, 0.18, 0.44), Vector3(-0.58, 0.7, -0.33), Color("#fff8f0"))
	box(root, Vector3(0.8, 0.18, 0.44), Vector3(0.36, 0.7, -0.33), Color("#fff8f0"))
	return root

static func create_shelf() -> Node3D:
	var root := Node3D.new()
	box(root, Vector3(1.7, 0.15, 0.42), Vector3(0, 0.12, 0), DARK_WOOD)
	box(root, Vector3(1.7, 0.15, 0.42), Vector3(0, 1.05, 0), DARK_WOOD)
	box(root, Vector3(1.7, 0.15, 0.42), Vector3(0, 1.98, 0), DARK_WOOD)
	box(root, Vector3(0.15, 2.1, 0.42), Vector3(-0.78, 1.05, 0), DARK_WOOD)
	box(root, Vector3(0.15, 2.1, 0.42), Vector3(0.78, 1.05, 0), DARK_WOOD)
	var book_colors := [ROSE, GOLD, SKY, MINT, PLUM]
	for shelf_idx in range(2):
		for i in range(5):
			var h := 0.46 + float((i + shelf_idx) % 3) * 0.09
			box(root, Vector3(0.18, h, 0.28), Vector3(-0.55 + i * 0.27, 0.24 + shelf_idx * 0.93 + h * 0.5, 0), book_colors[i])
	return root

static func create_side_table() -> Node3D:
	var root := Node3D.new()
	box(root, Vector3(0.9, 0.15, 0.75), Vector3(0, 0.72, 0), WOOD)
	for x in [-0.32, 0.32]:
		for z in [-0.25, 0.25]:
			box(root, Vector3(0.1, 0.7, 0.1), Vector3(x, 0.35, z), DARK_WOOD)
	var book := box(root, Vector3(0.48, 0.08, 0.34), Vector3(0.1, 0.84, 0), SKY)
	book.rotation.y = 0.18
	return root

static func create_mascot() -> Node3D:
	var root := Node3D.new()
	root.name = "RoomBuddy"
	capsule(root, 0.32, 0.94, Vector3(0, 0.5, 0), Color("#777ef2"))
	sphere(root, 0.38, Vector3(0, 1.15, 0), Color("#b7c6ff"))
	sphere(root, 0.055, Vector3(-0.13, 1.21, 0.34), INK)
	sphere(root, 0.055, Vector3(0.13, 1.21, 0.34), INK)
	cylinder(root, 0.025, 0.28, Vector3(0, 1.56, 0), GOLD)
	sphere(root, 0.08, Vector3(0, 1.72, 0), GOLD, material(GOLD, 0.4, GOLD, 1.4))
	return root

static func _build_sofa(root: Node3D) -> void:
	box(root, Vector3(2.25, 0.46, 0.96), Vector3(0, 0.35, 0), PLUM)
	box(root, Vector3(2.25, 0.92, 0.28), Vector3(0, 0.85, -0.35), Color("#725ec0"))
	box(root, Vector3(0.3, 0.72, 1.02), Vector3(-1.03, 0.55, 0), Color("#725ec0"))
	box(root, Vector3(0.3, 0.72, 1.02), Vector3(1.03, 0.55, 0), Color("#725ec0"))
	box(root, Vector3(0.92, 0.15, 0.72), Vector3(-0.49, 0.64, 0.08), LILAC)
	box(root, Vector3(0.92, 0.15, 0.72), Vector3(0.49, 0.64, 0.08), LILAC)
	box(root, Vector3(0.8, 0.12, 0.16), Vector3(-0.48, 1.08, -0.16), Color("#c7b9fb"))
	box(root, Vector3(0.8, 0.12, 0.16), Vector3(0.48, 1.08, -0.16), Color("#c7b9fb"))

static func _build_lamp(root: Node3D) -> void:
	cylinder(root, 0.34, 0.12, Vector3(0, 0.06, 0), GOLD)
	cylinder(root, 0.055, 1.65, Vector3(0, 0.9, 0), Color("#f4e5bb"))
	cylinder(root, 0.48, 0.58, Vector3(0, 1.75, 0), GOLD, 0.28)
	var light := OmniLight3D.new()
	light.position = Vector3(0, 1.65, 0)
	light.light_color = Color("#ffdca0")
	light.light_energy = 1.4
	light.omni_range = 4.4
	light.shadow_enabled = true
	root.add_child(light)

static func _build_plant(root: Node3D) -> void:
	cylinder(root, 0.44, 0.58, Vector3(0, 0.29, 0), Color("#c97e6b"), 0.34)
	cylinder(root, 0.055, 1.0, Vector3(0, 0.95, 0), Color("#557f58"))
	var leaf_color := Color("#6dc48a")
	for i in range(7):
		var angle := TAU * float(i) / 7.0
		var leaf := capsule(root, 0.11, 0.78, Vector3(cos(angle) * 0.23, 1.28 + (i % 2) * 0.12, sin(angle) * 0.23), leaf_color)
		leaf.rotation = Vector3(0.55 * cos(angle), -angle, 0.55 * sin(angle))

static func _build_desk(root: Node3D) -> void:
	box(root, Vector3(2.05, 0.18, 0.88), Vector3(0, 0.9, 0), WOOD)
	for x in [-0.84, 0.84]:
		for z in [-0.3, 0.3]:
			box(root, Vector3(0.12, 0.9, 0.12), Vector3(x, 0.45, z), DARK_WOOD)
	box(root, Vector3(0.95, 0.62, 0.08), Vector3(0, 1.42, -0.14), INK)
	box(root, Vector3(0.82, 0.49, 0.04), Vector3(0, 1.42, -0.09), Color("#5ec7ff"), 0.0, material(Color("#5ec7ff"), 0.45, Color("#5ec7ff"), 0.85))
	box(root, Vector3(0.08, 0.5, 0.08), Vector3(0, 1.0, -0.14), INK)
	box(root, Vector3(0.58, 0.06, 0.35), Vector3(0, 0.97, 0.08), INK)
