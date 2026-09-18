extends Node

func _ready() -> void:
	var scene := load("res://main.tscn") as PackedScene
	var app := scene.instantiate()
	add_child(app)
	await get_tree().process_frame
	await get_tree().process_frame
	app.call("prepare_showcase")
	await get_tree().process_frame
	var camera := app.get("camera") as Camera3D
	if camera != null:
		camera.position = Vector3(10.6, 6.65, 12.25)
		camera.look_at(Vector3(1.55, 0.92, -0.55), Vector3.UP)
	for _frame in range(55):
		await get_tree().process_frame
	var image := get_viewport().get_texture().get_image()
	var capture_path := "/tmp/adventure-world-capture.png"
	var result := image.save_png(capture_path)
	print("ADVENTURE_WORLD_CAPTURE=", capture_path, " result=", result)
	get_tree().quit(0 if result == OK else 1)
