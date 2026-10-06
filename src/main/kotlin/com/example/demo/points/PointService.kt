package com.example.demo.points

import org.springframework.stereotype.Service

class InvalidPointException(message: String) : RuntimeException(message)

@Service
class PointService(private val repository: PointRepository) {
    fun mapViewModel() = MapPageViewModel(MapConfigurationViewModel(), repository.findAll().map(::viewModel))

    fun create(request: CreatePointRequest): PointViewModel {
        val name = request.name.trim()
        if (name.isBlank()) throw InvalidPointException("Enter a name.")
        if (name.length > 100) throw InvalidPointException("Use 100 characters or fewer.")

        val (latitude, longitude) = request.coordinate
        if (!latitude.isFinite() || latitude !in -90.0..90.0) {
            throw InvalidPointException("Latitude must be a number between -90 and 90.")
        }
        if (!longitude.isFinite() || longitude !in -180.0..180.0) {
            throw InvalidPointException("Longitude must be a number between -180 and 180.")
        }

        return viewModel(repository.save(name, request.coordinate))
    }

    private fun viewModel(point: StoredPoint) = PointViewModel(
        point.id.toString(), point.name, point.coordinate,
    )
}
