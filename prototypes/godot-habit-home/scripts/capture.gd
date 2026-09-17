extends Node

func _ready() -> void:
	var scene := load("res://main.tscn") as PackedScene
	var app := scene.instantiate()
	add_child(app)
	await get_tree().process_frame

	app.state.reset_demo()
	for habit in HabitState.HABITS:
		app.state.complete_habit(habit["id"])
	for item_id in ["sofa", "lamp", "plant"]:
		app.state.purchase(item_id)
		app.call("_spawn_owned_item", item_id, false)
	app.call("_refresh_ui")
	app.call("_select_item", "sofa")

	for _frame in range(30):
		await get_tree().process_frame

	var image := get_viewport().get_texture().get_image()
	var capture_path := "/tmp/habit-home-capture.png"
	var result := image.save_png(capture_path)
	print("HABIT_HOME_CAPTURE=", capture_path, " result=", result)
	get_tree().quit(0 if result == OK else 1)
