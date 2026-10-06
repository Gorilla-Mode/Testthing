package com.example.demo

import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam

@Controller
class HomeController {

    @GetMapping("/")
    fun index(@RequestParam(defaultValue = "") name: String, model: Model): String {
        model.addAttribute("greeting", GreetingViewModel(name.trim()))
        return "index"
    }
}
