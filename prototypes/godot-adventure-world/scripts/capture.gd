extends Node

func _ready() -> void:
	var scene := load("res://main.tscn") as PackedScene
	var app := scene.instantiate()
	add_child(app)
	await get_tree().process_frame
	await get_tree().process_frame
	app.call("prepare_showcase")
	for _frame in range(55):
		await get_tree().process_frame
	var image := get_viewport().get_texture().get_image()
	var capture_path := "/tmp/adventure-world-capture.png"
	var result := image.save_png(capture_path)
	print("ADVENTURE_WORLD_CAPTURE=", capture_path, " result=", result)
	get_tree().quit(0 if result == OK else 1)
