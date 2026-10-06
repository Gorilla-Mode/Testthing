package com.example.demo

import com.example.demo.points.PointService
import org.hamcrest.Matchers.containsString
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
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.ObjectMapper
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

@SpringBootTest(properties = ["app.frontend.dev=true"])
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class PointControllerTests {
    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var mapper: ObjectMapper
    @Autowired lateinit var service: PointService

    private fun create(name: String = "Observation point") = mockMvc.perform(post("/web/points")
        .contentType(MediaType.APPLICATION_JSON)
        .content(mapper.writeValueAsString(mapOf("name" to name,
            "coordinate" to mapOf("latitude" to 60.4055, "longitude" to 5.3435)))))

    @Test
    fun `initial page embeds server configuration and empty points`() {
        mockMvc.perform(get("/"))
            .andExpect(status().isOk)
            .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
            .andExpect(content().string(containsString("id=\"app-data\" type=\"application/json\"")))
            .andExpect(content().string(containsString("\"points\":[]")))
            .andExpect(content().string(containsString("http://localhost:5173/src/main.tsx")))
        mockMvc.perform(get("/web/map"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.map.center.latitude").value(60.4055))
            .andExpect(jsonPath("$.points").isEmpty)
    }

    @Test
    fun `creation trims name generates unique UUIDs and preserves coordinates across requests`() {
        val first = create("  Observation point  ")
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.name").value("Observation point"))
            .andExpect(jsonPath("$.coordinate.latitude").value(60.4055))
            .andExpect(jsonPath("$.coordinate.longitude").value(5.3435))
            .andExpect(jsonPath("$.coordinateLabel").value("60.40550, 5.34350"))
            .andReturn().response.contentAsString
        val firstId = mapper.readValue(first, Map::class.java)["id"] as String
        assertEquals(firstId, UUID.fromString(firstId).toString())
        val second = create().andExpect(status().isCreated).andReturn().response.contentAsString
        assertNotEquals(firstId, mapper.readValue(second, Map::class.java)["id"])
        mockMvc.perform(get("/web/map"))
            .andExpect(jsonPath("$.points.length()").value(2))
            .andExpect(jsonPath("$.points[0].id").value(firstId))
        mockMvc.perform(get("/"))
            .andExpect(content().string(containsString(firstId)))
    }

    @Test
    fun `invalid input returns field errors without storing anything`() {
        mockMvc.perform(post("/web/points").contentType(MediaType.APPLICATION_JSON)
            .content("""{"name":"  ","coordinate":{"latitude":91,"longitude":181}}"""))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.fieldErrors.name").exists())
            .andExpect(jsonPath("$.fieldErrors['coordinate.latitude']").exists())
            .andExpect(jsonPath("$.fieldErrors['coordinate.longitude']").exists())
        assertTrue(service.mapViewModel().points.isEmpty())
    }

    @Test
    fun `long names and missing coordinates are rejected`() {
        create("x".repeat(101)).andExpect(status().isBadRequest)
        mockMvc.perform(post("/web/points").contentType(MediaType.APPLICATION_JSON)
            .content("""{"name":"Test"}"""))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.fieldErrors['coordinate.latitude']").exists())
        assertTrue(service.mapViewModel().points.isEmpty())
    }

    @Test
    fun `malformed JSON and nonnumeric coordinates return a useful error`() {
        listOf("{broken", """{"name":"Test","coordinate":{"latitude":"invalid","longitude":5}}""")
            .forEach { body ->
                mockMvc.perform(post("/web/points").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest)
                    .andExpect(jsonPath("$.message").exists())
            }
        assertTrue(service.mapViewModel().points.isEmpty())
    }

    @Test
    fun `names cannot terminate the bootstrap script and survive JSON round trip`() {
        val name = "</script><script>alert('hello')</script><!-- APP_ASSETS -->&"
        create(name).andExpect(status().isCreated)
        val html = mockMvc.perform(get("/")).andReturn().response.contentAsString
        assertFalse(html.contains(name))
        assertFalse(html.contains("<script>alert("))
        assertTrue(html.contains("\\u003c/script\\u003e"))
        val bootstrap = html.substringAfter("<script id=\"app-data\" type=\"application/json\">")
            .substringBefore("</script>")
        val model = mapper.readValue(bootstrap, com.example.demo.points.MapPageViewModel::class.java)
        assertEquals(name, model.points.single().name)
    }
}
