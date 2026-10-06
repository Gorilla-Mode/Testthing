package com.example.demo.points

import org.springframework.stereotype.Service
import java.util.Locale

class InvalidPointException(val errors: Map<String, String>) : RuntimeException("Check the highlighted fields.")

@Service
class PointService(private val repository: PointRepository) {
    fun mapViewModel() = MapPageViewModel(MapConfigurationViewModel(), repository.findAll().map(::viewModel))

    fun create(request: CreatePointRequest): PointViewModel {
        val errors = linkedMapOf<String, String>()
        val name = request.name?.trim().orEmpty()
        if (name.isBlank()) errors["name"] = "Enter a name."
        else if (name.length > 100) errors["name"] = "Use 100 characters or fewer."

        val latitude = request.coordinate?.latitude
        val longitude = request.coordinate?.longitude
        if (latitude == null || !latitude.isFinite() || latitude !in -90.0..90.0) {
            errors["coordinate.latitude"] = "Latitude must be a number between -90 and 90."
        }
        if (longitude == null || !longitude.isFinite() || longitude !in -180.0..180.0) {
            errors["coordinate.longitude"] = "Longitude must be a number between -180 and 180."
        }
        if (errors.isNotEmpty()) throw InvalidPointException(errors)

        return viewModel(repository.save(name, Coordinate(latitude!!, longitude!!)))
    }

    private fun viewModel(point: StoredPoint) = PointViewModel(
        point.id.toString(), point.name, point.coordinate,
        String.format(Locale.ROOT, "%.5f, %.5f", point.coordinate.latitude, point.coordinate.longitude),
    )
}
