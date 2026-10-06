package com.example.demo.points

import java.util.UUID

data class Coordinate(val latitude: Double, val longitude: Double)

data class StoredPoint(val id: UUID, val name: String, val coordinate: Coordinate)

data class PointViewModel(
    val id: String,
    val name: String,
    val coordinate: Coordinate,
)

data class MapConfigurationViewModel(
    val center: Coordinate = Coordinate(60.4055, 5.3435),
    val zoom: Double = 13.5,
    val maxZoom: Double = 18.0,
    val tileUrl: String = "https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png",
    val attribution: String = "&copy; <a href=\"https://www.kartverket.no/\">Kartverket</a>",
)

data class MapPageViewModel(
    val map: MapConfigurationViewModel,
    val points: List<PointViewModel>,
)

data class CreatePointRequest(
    val name: String,
    val coordinate: Coordinate,
)

data class InputError(val message: String)
