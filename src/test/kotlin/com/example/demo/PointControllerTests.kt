package com.example.demo

import com.example.demo.points.Coordinate
import com.example.demo.points.CreatePointRequest
import com.example.demo.points.MapPageViewModel
import com.example.demo.points.PointService
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.annotation.DirtiesContext
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.header
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.ObjectMapper
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class PointControllerTests {
    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var mapper: ObjectMapper
    @Autowired lateinit var service: PointService

    private fun create(name: String = "Observation point", latitude: Double = 60.4055, longitude: Double = 5.3435) =
        mockMvc.perform(post("/web/points").contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(CreatePointRequest(name, Coordinate(latitude, longitude)))))

    @Test
    fun `initial map model round trips through JSON`() {
        val data = mockMvc.perform(get("/web/map"))
            .andExpect(status().isOk)
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.points").isEmpty)
            .andExpect(jsonPath("$.map.center.latitude").value(60.4055))
            .andReturn().response.contentAsString
        assertEquals(service.mapViewModel(), mapper.readValue(data, MapPageViewModel::class.java))
    }

    @Test
    fun `creation returns canonical JSON with server UUID and preserves coordinates`() {
        create("  Observation point  ")
            .andExpect(status().isCreated)
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.name").value("Observation point"))
            .andExpect(jsonPath("$.coordinate.latitude").value(60.4055))
            .andExpect(jsonPath("$.coordinate.longitude").value(5.3435))
        val first = service.mapViewModel().points.single()
        assertEquals(first.id, UUID.fromString(first.id).toString())
        create().andExpect(status().isCreated)
        assertNotEquals(first.id, service.mapViewModel().points.last().id)
        mockMvc.perform(get("/web/map"))
            .andExpect(jsonPath("$.points.length()").value(2))
            .andExpect(jsonPath("$.points[0].id").value(first.id))
    }

    @Test
    fun `invalid values return one message without saving`() {
        create("  ").andExpect(status().isBadRequest)
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.message").value("Enter a name."))
            .andExpect(jsonPath("$.fieldErrors").doesNotExist())
        for (latitude in listOf(-91.0, 91.0)) {
            create(latitude = latitude).andExpect(status().isBadRequest)
                .andExpect(jsonPath("$.message").value("Latitude must be a number between -90 and 90."))
        }
        for (longitude in listOf(-181.0, 181.0)) {
            create(longitude = longitude).andExpect(status().isBadRequest)
                .andExpect(jsonPath("$.message").value("Longitude must be a number between -180 and 180."))
        }
        assertTrue(service.mapViewModel().points.isEmpty())
    }

    @Test
    fun `required fields cannot be omitted or null`() {
        for (body in listOf("{}", """{"name":null,"coordinate":null}""", """{"coordinate":{}}""",
            """{"name":"Test"}""", """{"name":"Test","coordinate":null}""",
            """{"coordinate":{"latitude":60,"longitude":5}}""",
            """{"name":null,"coordinate":{"latitude":60,"longitude":5}}""",
            """{"name":"Test","coordinate":{"latitude":null,"longitude":5}}""",
            """{"name":"Test","coordinate":{"latitude":60,"longitude":null}}""",
            """{"name":"Test","coordinate":{"latitude":60}}""",
            """{"name":"Test","coordinate":{"longitude":5}}""")) {
            mockMvc.perform(post("/web/points").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest)
                .andExpect(jsonPath("$.message").value("The request must contain a name and numeric coordinates."))
        }
        assertTrue(service.mapViewModel().points.isEmpty())
    }

    @Test
    fun `long names are rejected`() {
        create("x".repeat(101)).andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.message").value("Use 100 characters or fewer."))
        assertTrue(service.mapViewModel().points.isEmpty())
    }

    @Test
    fun `malformed JSON wrong types and empty bodies produce the error contract`() {
        for (body in listOf("{broken", "", """{"name":"Test","coordinate":{"latitude":"invalid","longitude":5}}""",
            """{"name":"Test","coordinate":[]} """)) {
            mockMvc.perform(post("/web/points").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest)
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.fieldErrors").doesNotExist())
        }
        assertTrue(service.mapViewModel().points.isEmpty())
    }

    @Test
    fun `form submissions are rejected`() {
        mockMvc.perform(post("/web/points").contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .param("name", "Test").param("latitude", "60").param("longitude", "5"))
            .andExpect(status().isUnsupportedMediaType)
        assertTrue(service.mapViewModel().points.isEmpty())
    }

    @Test
    fun `coordinate bounds are accepted through JSON`() {
        create("South", -90.0, -180.0).andExpect(status().isCreated)
        create("North", 90.0, 180.0).andExpect(status().isCreated)
        assertEquals(2, service.mapViewModel().points.size)
    }

    @Test
    fun `names containing HTML round trip through JSON`() {
        val name = "</script><script>alert(1)</script><b>Point</b>&"
        create(name).andExpect(status().isCreated).andExpect(jsonPath("$.name").value(name))
        val data = mockMvc.perform(get("/web/map"))
            .andExpect(status().isOk)
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.points[0].name").value(name))
            .andReturn().response.contentAsString
        val model = mapper.readValue(data, MapPageViewModel::class.java)
        assertEquals(name, model.points.single().name)
        assertEquals(service.mapViewModel(), model)
    }
}
