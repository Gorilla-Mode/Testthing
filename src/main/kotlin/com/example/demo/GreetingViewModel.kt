package com.example.demo

data class GreetingViewModel(val name: String = "") {
    val message: String
        get() = if (name.isBlank()) "Welcome!" else "Hello, $name!"
}
