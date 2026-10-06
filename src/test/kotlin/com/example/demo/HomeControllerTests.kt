package com.example.demo

import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.view
import kotlin.test.assertFalse
import kotlin.test.assertTrue

@SpringBootTest
@AutoConfigureMockMvc
class HomeControllerTests {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Test
    fun `home renders the default greeting and form`() {
        mockMvc.perform(get("/"))
            .andExpect(status().isOk)
            .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
            .andExpect(view().name("index"))
            .andExpect(content().string(containsString("<p class=\"greeting\">Welcome!</p>")))
            .andExpect(content().string(containsString("<form method=\"get\" action=\"/\">")))
            .andExpect(content().string(containsString("name=\"name\"")))
            .andExpect(content().string(containsString("value=\"\"")))
    }

    @Test
    fun `form renders a personalized greeting and retains the name`() {
        mockMvc.perform(get("/").param("name", "Kotlin"))
            .andExpect(status().isOk)
            .andExpect(content().string(containsString("<p class=\"greeting\">Hello, Kotlin!</p>")))
            .andExpect(content().string(containsString("value=\"Kotlin\"")))
    }

    @Test
    fun `name is trimmed before rendering`() {
        mockMvc.perform(get("/").param("name", "  Kotlin  "))
            .andExpect(status().isOk)
            .andExpect(content().string(containsString("<p class=\"greeting\">Hello, Kotlin!</p>")))
            .andExpect(content().string(containsString("value=\"Kotlin\"")))
    }

    @Test
    fun `blank name uses the default greeting`() {
        mockMvc.perform(get("/").param("name", "   "))
            .andExpect(status().isOk)
            .andExpect(content().string(containsString("<p class=\"greeting\">Welcome!</p>")))
            .andExpect(content().string(containsString("value=\"\"")))
    }

    @Test
    fun `HTML in the name is escaped in text and input values`() {
        val name = "<script>alert(\"hello\")</script>"
        val result = mockMvc.perform(get("/").param("name", name))
            .andExpect(status().isOk)
            .andExpect(content().string(containsString(
                "<p class=\"greeting\">Hello, &lt;script&gt;alert(&quot;hello&quot;)&lt;/script&gt;!</p>"
            )))
            .andExpect(content().string(containsString(
                "value=\"&lt;script&gt;alert(&quot;hello&quot;)&lt;/script&gt;\""
            )))
            .andReturn()

        val html = result.response.contentAsString
        assertTrue(html.contains("&lt;script&gt;"))
        assertFalse(html.contains("<script>"))
    }

    @Test
    fun `page stylesheet is served`() {
        mockMvc.perform(get("/css/style.css"))
            .andExpect(status().isOk)
            .andExpect(content().contentTypeCompatibleWith("text/css"))
    }
}
