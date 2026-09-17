class_name HabitState
extends RefCounted

signal coins_changed(value: int)
signal habits_changed
signal inventory_changed

const SAVE_PATH := "user://habit_home_spike.json"

const HABITS := [
	{"id": "water", "label": "Drink water", "reward": 25, "symbol": "💧"},
	{"id": "read", "label": "Read 20 min", "reward": 35, "symbol": "📖"},
	{"id": "move", "label": "Move your body", "reward": 30, "symbol": "⚡"},
]

const SHOP := [
	{"id": "sofa", "label": "Cloud Sofa", "price": 80, "symbol": "SOFA"},
	{"id": "lamp", "label": "Moon Lamp", "price": 45, "symbol": "LAMP"},
	{"id": "plant", "label": "Tiny Palm", "price": 35, "symbol": "PLANT"},
	{"id": "desk", "label": "Focus Desk", "price": 120, "symbol": "DESK"},
]

var coins: int = 150
var streak: int = 6
var completed_habits: Dictionary = {}
var owned_items: Dictionary = {}
var placements: Dictionary = {}

func _init() -> void:
	load_state()

func complete_habit(habit_id: String) -> int:
	if completed_habits.get(habit_id, false):
		return 0
	for habit in HABITS:
		if habit["id"] == habit_id:
			completed_habits[habit_id] = true
			var reward: int = int(habit["reward"])
			coins += reward
			save_state()
			coins_changed.emit(coins)
			habits_changed.emit()
			return reward
	return 0

func purchase(item_id: String) -> bool:
	if owned_items.get(item_id, false):
		return false
	for item in SHOP:
		if item["id"] == item_id:
			var price: int = int(item["price"])
			if coins < price:
				return false
			coins -= price
			owned_items[item_id] = true
			save_state()
			coins_changed.emit(coins)
			inventory_changed.emit()
			return true
	return false

func is_habit_complete(habit_id: String) -> bool:
	return completed_habits.get(habit_id, false)

func owns(item_id: String) -> bool:
	return owned_items.get(item_id, false)

func save_placement(item_id: String, position: Vector3, yaw: float) -> void:
	placements[item_id] = {
		"x": position.x,
		"z": position.z,
		"yaw": yaw,
	}
	save_state()

func get_placement(item_id: String, fallback: Vector3) -> Dictionary:
	var value: Variant = placements.get(item_id)
	if value is Dictionary:
		return value
	return {"x": fallback.x, "z": fallback.z, "yaw": 0.0}

func reset_demo() -> void:
	coins = 150
	streak = 6
	completed_habits.clear()
	owned_items.clear()
	placements.clear()
	save_state()
	coins_changed.emit(coins)
	habits_changed.emit()
	inventory_changed.emit()

func save_state() -> void:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		return
	var payload := {
		"coins": coins,
		"streak": streak,
		"completed_habits": completed_habits,
		"owned_items": owned_items,
		"placements": placements,
	}
	file.store_string(JSON.stringify(payload))

func load_state() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary:
		return
	coins = int(parsed.get("coins", coins))
	streak = int(parsed.get("streak", streak))
	completed_habits = parsed.get("completed_habits", {})
	owned_items = parsed.get("owned_items", {})
	placements = parsed.get("placements", {})
