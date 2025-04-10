import { Command } from "@cliffy/command";
import { Input } from "@cliffy/prompt";
import { useFileFlag } from "./alias/utils.ts";
import { loadFromFile, recordUsageLocal, saveToFile } from "./alias/file.ts";
import { loadFromKV, saveToKV, updateUsageKV } from "./alias/kv.ts";

const cmd = new Command()
  .name("alias")
  .version("0.4.0")
  .description("Alias manager CLI (KV by default)")
  .globalOption("--use-file", "Use local file instead of Deno KV");

cmd.command("add <name:string> <command:string>")
  .description("Add a new alias")
  .action(async (options, name, command) => {
    if (useFileFlag(options)) {
      const aliases = await loadFromFile();
      aliases[name] = { command, usage: [] };
      await saveToFile(aliases);
    } else {
      await saveToKV(name, { command, usage: [] });
    }
    console.log(`✅ Alias '${name}' added -> "${command}"`);
  });

cmd.command("run [name:string]")
  .description("Run an alias (with optional fuzzy UI)")
  .action(async (options, name?: string) => {
    const useFile = useFileFlag(options);
    const aliases = useFile ? await loadFromFile() : await loadFromKV();
    const names = Object.keys(aliases);

    if (names.length === 0) {
      console.log("📭 No aliases available.");
      return;
    }

    let target = name;
    if (!target || !aliases[target]) {
      target = await Input.prompt({
        message: "🔍 Select alias to run",
        suggestions: names,
        list: true,
        info: true,
      });
    }

    const entry = aliases[target];
    if (!entry) {
      console.error(`❌ Alias '${target}' not found.`);
      Deno.exit(1);
    }

    if (useFile) {
      recordUsageLocal(entry);
      await saveToFile(aliases);
    } else {
      await updateUsageKV(target);
    }

    console.log(`🚀 Executing: ${entry.command}`);
    const command = new Deno.Command("sh", {
      args: ["-c", entry.command],
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
    });
    const { code } = await command.output();
    Deno.exit(code);
  });

cmd.command("list")
  .description("List all aliases")
  .action(async (options) => {
    const aliases = useFileFlag(options)
      ? await loadFromFile()
      : await loadFromKV();
    const keys = Object.keys(aliases);
    if (keys.length === 0) {
      console.log("📭 No aliases defined.");
      return;
    }
    for (const [name, entry] of Object.entries(aliases)) {
      const star = entry.favorite ? "⭐ " : "";
      console.log(`${star}${name} -> ${entry.command}`);
    }
  });

await cmd.parse(Deno.args);
