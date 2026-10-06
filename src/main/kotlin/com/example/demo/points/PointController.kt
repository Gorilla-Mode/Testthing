package com.example.demo.points

import org.springframework.http.HttpStatus
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.ResponseBody

@Controller
class PointController(private val service: PointService) {
    @GetMapping("/web/map")
    @ResponseBody
    fun map(): MapPageViewModel = service.mapViewModel()

    @PostMapping("/web/points")
    @ResponseBody
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@RequestBody request: CreatePointRequest): PointViewModel = service.create(request)

    @ExceptionHandler(InvalidPointException::class)
    @ResponseBody
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    fun invalidPoint(exception: InvalidPointException) = InputError(exception.message!!, exception.errors)

    @ExceptionHandler(HttpMessageNotReadableException::class)
    @ResponseBody
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    fun malformedRequest() = InputError("The request must contain a name and numeric coordinates.")
}


