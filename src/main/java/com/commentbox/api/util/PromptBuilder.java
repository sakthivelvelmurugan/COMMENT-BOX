package com.commentbox.api.util;

import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class PromptBuilder {

    private static final Map<String, String> LANGUAGE_LABEL = Map.of(
        "java", "Java",
        "python", "Python",
        "cpp", "C++"
    );

    private static final Map<String, String> STYLE_INSTRUCTION = Map.of(
        "inline", "Use concise inline comments (// for Java/C++ and # for Python) placed on the same line or immediately above each statement.",
        "block", "Use descriptive block comments above each logical section, function, or class block.",
        "jsdoc", "Use Javadoc/JSDoc-style comments (/** ... */) for classes and methods, supplemented with brief inline comments where needed."
    );

    private static final Map<String, String> DENSITY_INSTRUCTION = Map.of(
        "normal", "Comment every meaningful block and non-obvious line.",
        "verbose", "Comment every single line, including obvious ones, with thorough explanations.",
        "minimal", "Comment only the complex or non-obvious parts while skipping trivial sections."
    );

    public String buildPrompt(String language, String style, String density, String code) {
        String languageLabel = LANGUAGE_LABEL.getOrDefault(language.toLowerCase(), language);
        String styleInstruction = STYLE_INSTRUCTION.getOrDefault(style.toLowerCase(), STYLE_INSTRUCTION.get("normal"));
        String densityInstruction = DENSITY_INSTRUCTION.getOrDefault(density.toLowerCase(), DENSITY_INSTRUCTION.get("normal"));

        return "You are an expert " + languageLabel + " developer and technical writer.\n\n"
            + "Your task: add helpful comments to the following " + languageLabel + " code.\n\n"
            + "Comment style: " + styleInstruction + "\n"
            + "Comment density: " + densityInstruction + "\n\n"
            + "Rules:\n"
            + "- Return ONLY the commented code, nothing else.\n"
            + "- Do not change the logic, structure, or formatting of the original code.\n"
            + "- Do not add markdown fences or any explanation outside the code.\n"
            + "- Keep comments concise, accurate, and developer-focused.\n\n"
            + "Code to comment:\n```" + language + "\n"
            + code + "\n```";
    }
}
