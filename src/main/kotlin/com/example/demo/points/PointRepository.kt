package com.example.demo.points

import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class PointRepository {
    private val points = linkedMapOf<UUID, StoredPoint>()

    @Synchronized
    fun save(name: String, coordinate: Coordinate): StoredPoint {
        val point = StoredPoint(UUID.randomUUID(), name, coordinate)
        points[point.id] = point
        return point
    }

    @Synchronized
    fun findAll(): List<StoredPoint> = points.values.toList()
}
