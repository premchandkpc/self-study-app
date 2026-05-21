import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export class JavaExecutor {
  static async execute(code, inputData) {
    const tmpDir = os.tmpdir();
    const className = `Algorithm_${Date.now()}`;
    const javaFile = path.join(tmpDir, `${className}.java`);
    const outputFile = path.join(tmpDir, `${className}_out.json`);

    try {
      // Generate Java class
      const javaCode = this.wrapCode(code, className, inputData, outputFile);
      fs.writeFileSync(javaFile, javaCode);

      // Compile
      execSync(`javac "${javaFile}"`, { timeout: 5000 });

      // Execute
      const classPath = tmpDir;
      execSync(`java -cp "${classPath}" ${className}`, { timeout: 5000 });

      // Read output
      if (fs.existsSync(outputFile)) {
        const output = fs.readFileSync(outputFile, 'utf-8');
        return JSON.parse(output);
      }

      return { steps: [], error: 'No output generated' };
    } catch (e) {
      return { steps: [], error: `Java execution failed: ${e.message}` };
    } finally {
      [javaFile, path.join(tmpDir, `${className}.class`), outputFile].forEach(f => {
        try { fs.unlinkSync(f); } catch { }
      });
    }
  }

  static wrapCode(userCode, className, inputData, outputFile) {
    const inputJson = JSON.stringify(JSON.stringify(inputData));

    return `
import java.util.*;
import java.io.*;
import com.google.gson.*;

public class ${className} {
  static class Tracer {
    List<Map<String, Object>> steps = new ArrayList<>();

    void step(String title, String description, Map<String, Object> state) {
      step(title, description, state, null);
    }

    void step(String title, String description, Map<String, Object> state, Map<String, Object> metadata) {
      Map<String, Object> step = new LinkedHashMap<>();
      step.put("title", title);
      step.put("description", description);
      step.put("state", state != null ? state : new HashMap<>());

      List<Map<String, Object>> opsLog = new ArrayList<>();
      Map<String, Object> log = new HashMap<>();
      log.put("msg", description);
      log.put("type", "info");
      opsLog.add(log);
      step.put("opsLog", opsLog);

      if (metadata != null) {
        step.putAll(metadata);
      }
      steps.add(step);
    }

    void found(Object result, Map<String, Object> context) {
      Map<String, Object> step = new LinkedHashMap<>();
      step.put("title", "Found");
      step.put("description", "Found: " + new Gson().toJson(result));
      step.put("result", result);

      List<Map<String, Object>> opsLog = new ArrayList<>();
      Map<String, Object> log = new HashMap<>();
      log.put("msg", "Found: " + new Gson().toJson(result));
      log.put("type", "success");
      opsLog.add(log);
      step.put("opsLog", opsLog);

      if (context != null && context.containsKey("state")) {
        step.put("state", context.get("state"));
      }
      steps.add(step);
    }
  }

  public static void main(String[] args) throws Exception {
    // Parse input
    String inputJson = ${inputJson};
    Map<String, Object> input = new Gson().fromJson(
      new Gson().fromJson(inputJson, String.class),
      Map.class
    );

    Tracer tracer = new Tracer();

    try {
      // User algorithm goes here
      // Note: This is a simplified approach.
      // For production, you'd need to properly parse and compile arbitrary Java code.
      algorithm(input, tracer);

      // Write output
      Map<String, Object> output = new LinkedHashMap<>();
      output.put("steps", tracer.steps);
      output.put("error", null);

      FileWriter fw = new FileWriter("${outputFile}");
      new Gson().toJson(output, fw);
      fw.close();
    } catch (Exception e) {
      Map<String, Object> output = new LinkedHashMap<>();
      output.put("steps", tracer.steps);
      output.put("error", e.getMessage());

      FileWriter fw = new FileWriter("${outputFile}");
      new Gson().toJson(output, fw);
      fw.close();
    }
  }

  static Object algorithm(Map<String, Object> input, Tracer tracer) {
    // Placeholder: actual algorithm would be compiled from user code
    // This requires complex Java code generation
    return null;
  }
}
`;
  }
}
