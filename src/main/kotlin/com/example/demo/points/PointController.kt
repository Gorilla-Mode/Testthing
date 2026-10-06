package com.example.demo.points

import org.springframework.http.CacheControl
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

@RestController
class PointController(private val service: PointService) {
    @GetMapping("/web/map", produces = [MediaType.APPLICATION_JSON_VALUE])
    fun map(): ResponseEntity<MapPageViewModel> = ResponseEntity.ok()
        .cacheControl(CacheControl.noStore()).body(service.mapViewModel())

    @PostMapping("/web/points", consumes = [MediaType.APPLICATION_JSON_VALUE], produces = [MediaType.APPLICATION_JSON_VALUE])
    fun create(@RequestBody request: CreatePointRequest): ResponseEntity<PointViewModel> = ResponseEntity.status(201)
        .cacheControl(CacheControl.noStore()).body(service.create(request))

    @ExceptionHandler(InvalidPointException::class)
    fun invalidPoint(exception: InvalidPointException): ResponseEntity<InputError> = ResponseEntity.badRequest()
        .cacheControl(CacheControl.noStore()).body(InputError(exception.message!!))

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun malformedRequest(): ResponseEntity<InputError> = ResponseEntity.badRequest()
        .cacheControl(CacheControl.noStore()).body(InputError("The request must contain a name and numeric coordinates."))
}
