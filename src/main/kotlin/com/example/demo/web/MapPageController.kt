package com.example.demo.web

import com.example.demo.points.PointService
import org.springframework.beans.factory.annotation.Value
import org.springframework.core.io.ClassPathResource
import org.springframework.http.CacheControl
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping
import tools.jackson.core.type.TypeReference
import tools.jackson.databind.ObjectMapper

data class ViteChunk(
    val file: String,
    val css: List<String> = emptyList(),
    val imports: List<String> = emptyList(),
)

@Controller
class MapPageController(
    private val service: PointService,
    private val objectMapper: ObjectMapper,
    @param:Value("\${app.frontend.dev:false}") private val frontendDev: Boolean,
) {
    private val shell by lazy { ClassPathResource("web/map-shell.html").getContentAsString(Charsets.UTF_8) }
    private val productionAssets by lazy { buildProductionAssets() }

    @GetMapping("/", produces = [MediaType.TEXT_HTML_VALUE])
    fun index(): ResponseEntity<String> {
        val json = objectMapper.writeValueAsString(service.mapViewModel())
            .replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
        val html = shell.replace("<!-- APP_DATA -->", json)
            .replace("<!-- APP_ASSETS -->", if (frontendDev) developmentAssets else productionAssets)
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(html)
    }

    private fun buildProductionAssets(): String {
        val resource = ClassPathResource("web/manifest.json")
        check(resource.exists()) { "Frontend build missing. Run ./gradlew bootRun, or use -PfrontendDev with Vite running." }
        val manifest = resource.inputStream.use {
            objectMapper.readValue(it, object : TypeReference<Map<String, ViteChunk>>() {})
        }
        val entry = manifest.getValue("src/main.tsx")
        val styles = linkedSetOf<String>()
        val visited = mutableSetOf<String>()
        fun collectStyles(chunk: ViteChunk) {
            styles.addAll(chunk.css)
            chunk.imports.forEach { if (visited.add(it)) collectStyles(manifest.getValue(it)) }
        }
        collectStyles(entry)
        return styles.joinToString("\n") { "<link rel=\"stylesheet\" href=\"/$it\">" } +
            "\n<script type=\"module\" src=\"/${entry.file}\"></script>"
    }

    private val developmentAssets = """
        <script type="module">
            import RefreshRuntime from 'http://localhost:5173/@react-refresh';
            RefreshRuntime.injectIntoGlobalHook(window);
            window.${'$'}RefreshReg${'$'} = () => {};
            window.${'$'}RefreshSig${'$'} = () => (type) => type;
            window.__vite_plugin_react_preamble_installed__ = true;
        </script>
        <script type="module" src="http://localhost:5173/@vite/client"></script>
        <script type="module" src="http://localhost:5173/src/main.tsx"></script>
    """.trimIndent()
}
