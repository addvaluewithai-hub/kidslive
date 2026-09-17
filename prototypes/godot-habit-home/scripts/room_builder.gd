class_name RoomBuilder
extends RefCounted

const FLOOR := Color("#59637d")
const FLOOR_ALT := Color("#505b76")
const WALL_BACK := Color("#a39ac8")
const WALL_LEFT := Color("#857fae")
const TRIM := Color("#eee8e7")

static func build(parent: Node3D) -> Dictionary:
	var room := Node3D.new()
	room.name = "Room"
	parent.add_child(room)

	# Slightly chunky architecture gives the orthographic scene readable, toy-like depth.
	FurnitureFactory.box(room, Vector3(9.2, 0.25, 7.2), Vector3(0, -0.125, 0), FLOOR)
	FurnitureFactory.box(room, Vector3(9.2, 4.5, 0.2), Vector3(0, 2.15, -3.55), WALL_BACK)
	FurnitureFactory.box(room, Vector3(0.2, 4.5, 7.2), Vector3(-4.55, 2.15, 0), WALL_LEFT)
	FurnitureFactory.box(room, Vector3(9.1, 0.13, 0.18), Vector3(0, 0.1, -3.42), TRIM)
	FurnitureFactory.box(room, Vector3(0.18, 0.13, 7.05), Vector3(-4.42, 0.1, 0), TRIM)

	# Inlaid floor bands keep the room feeling authored without using a texture asset.
	for i in range(-4, 5):
		var tint := FLOOR_ALT if abs(i) % 2 == 0 else Color("#626d87")
		FurnitureFactory.box(room, Vector3(0.025, 0.012, 6.9), Vector3(float(i) + 0.5, 0.008, 0), tint)

	_build_window(room)
	_build_rug(room)
	_build_wall_art(room)

	var bed := FurnitureFactory.create_bed()
	bed.position = Vector3(-2.75, 0.0, -1.72)
	bed.rotation.y = 0.0
	room.add_child(bed)

	var shelf := FurnitureFactory.create_shelf()
	shelf.position = Vector3(2.82, 0.0, -3.22)
	room.add_child(shelf)

	var side_table := FurnitureFactory.create_side_table()
	side_table.position = Vector3(-3.15, 0.0, 1.25)
	room.add_child(side_table)

	var buddy := FurnitureFactory.create_mascot()
	buddy.position = Vector3(0.4, 0.0, 1.65)
	room.add_child(buddy)

	return {"room": room, "buddy": buddy}

static func _build_window(room: Node3D) -> void:
	var night := FurnitureFactory.material(Color("#223863"), 0.5, Color("#315e9a"), 0.38)
	FurnitureFactory.box(room, Vector3(2.75, 1.8, 0.04), Vector3(1.15, 2.6, -3.42), Color("#223863"), 0.0, night)
	FurnitureFactory.box(room, Vector3(2.95, 0.13, 0.16), Vector3(1.15, 1.68, -3.32), TRIM)
	FurnitureFactory.box(room, Vector3(2.95, 0.13, 0.16), Vector3(1.15, 3.52, -3.32), TRIM)
	FurnitureFactory.box(room, Vector3(0.13, 1.95, 0.16), Vector3(-0.28, 2.6, -3.32), TRIM)
	FurnitureFactory.box(room, Vector3(0.13, 1.95, 0.16), Vector3(2.58, 2.6, -3.32), TRIM)
	FurnitureFactory.box(room, Vector3(0.09, 1.8, 0.12), Vector3(1.15, 2.6, -3.27), TRIM)
	FurnitureFactory.box(room, Vector3(2.75, 0.09, 0.12), Vector3(1.15, 2.58, -3.27), TRIM)
	var moon_mat := FurnitureFactory.material(Color("#ffe8a8"), 0.35, Color("#ffe8a8"), 1.5)
	FurnitureFactory.sphere(room, 0.24, Vector3(1.98, 3.06, -3.28), Color("#ffe8a8"), moon_mat)
	for i in range(9):
		var x := -0.02 + float((i * 37) % 250) / 100.0
		var y := 1.88 + float((i * 29) % 142) / 100.0
		FurnitureFactory.sphere(room, 0.022 if i % 3 else 0.035, Vector3(x, y, -3.25), Color("#dcecff"), FurnitureFactory.material(Color("#dcecff"), 0.4, Color("#dcecff"), 1.1))

static func _build_rug(room: Node3D) -> void:
	FurnitureFactory.box(room, Vector3(3.8, 0.035, 2.55), Vector3(0.45, 0.03, 0.3), Color("#7568c5"))
	FurnitureFactory.box(room, Vector3(3.55, 0.018, 2.3), Vector3(0.45, 0.052, 0.3), Color("#8d81dc"))
	for x in [-1.08, 0.45, 1.98]:
		FurnitureFactory.box(room, Vector3(0.06, 0.018, 2.05), Vector3(x, 0.064, 0.3), Color("#b9b0ef"))

static func _build_wall_art(room: Node3D) -> void:
	FurnitureFactory.box(room, Vector3(1.4, 1.05, 0.08), Vector3(-2.2, 2.65, -3.31), Color("#e8dfdf"))
	FurnitureFactory.box(room, Vector3(1.18, 0.82, 0.05), Vector3(-2.2, 2.65, -3.25), Color("#633f74"))
	FurnitureFactory.sphere(room, 0.23, Vector3(-2.02, 2.8, -3.2), Color("#ffcc79"), FurnitureFactory.material(Color("#ffcc79"), 0.5, Color("#ffcc79"), 0.45))
	FurnitureFactory.box(room, Vector3(0.7, 0.08, 0.05), Vector3(-2.3, 2.38, -3.18), Color("#f08fa8"), 0.24)
