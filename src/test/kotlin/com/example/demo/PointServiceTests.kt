package com.example.demo

import com.example.demo.points.CoordinateInput
import com.example.demo.points.CreatePointRequest
import com.example.demo.points.InvalidPointException
import com.example.demo.points.PointRepository
import com.example.demo.points.PointService
import org.junit.jupiter.api.Test
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class PointServiceTests {
    @Test
    fun `nonfinite coordinates cannot be stored`() {
        val service = PointService(PointRepository())
        for (value in listOf(Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY)) {
            assertFailsWith<InvalidPointException> {
                service.create(CreatePointRequest("Test", CoordinateInput(value, 5.0)))
            }
            assertFailsWith<InvalidPointException> {
                service.create(CreatePointRequest("Test", CoordinateInput(60.0, value)))
            }
        }
        assertTrue(service.mapViewModel().points.isEmpty())
    }

    @Test
    fun `coordinate bounds are inclusive and storage starts empty`() {
        val service = PointService(PointRepository())
        assertTrue(service.mapViewModel().points.isEmpty())
        service.create(CreatePointRequest("South", CoordinateInput(-90.0, -180.0)))
        service.create(CreatePointRequest("North", CoordinateInput(90.0, 180.0)))
        assertEquals(listOf("South", "North"), service.mapViewModel().points.map { it.name })
    }

    @Test
    fun `concurrent requests preserve every point and unique identifier`() {
        val service = PointService(PointRepository())
        Executors.newFixedThreadPool(4).use { executor ->
            executor.invokeAll((1..40).map { index -> Callable {
                service.create(CreatePointRequest("Point $index", CoordinateInput(60.0, 5.0)))
            } }).forEach { it.get() }
        }
        val points = service.mapViewModel().points
        assertEquals(40, points.size)
        assertEquals(40, points.map { it.id }.toSet().size)
    }
}
