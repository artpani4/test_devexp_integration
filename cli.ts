import { Command } from "jsr:@cliffy/command@1.0.0-rc.7";
import { Input } from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/mod.ts";

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
cmd.command("edit [name:string]")
  .description("Edit an alias (fuzzy UI if no name provided)")
  .action(async (options, name?: string) => {
    const useFile = useFileFlag(options);
    const aliases = useFile ? await loadFromFile() : await loadFromKV();
    const keys = Object.keys(aliases);

    if (keys.length === 0) {
      console.log("📭 No aliases defined.");
      return;
    }

    const aliasName = name || await Input.prompt({
      message: "✏️ Choose alias to edit",
      suggestions: keys,
      list: true,
      info: true,
    });

    const entry = aliases[aliasName];
    if (!entry) {
      console.error("❌ Alias not found");
      Deno.exit(1);
    }

    const updated = await Input.prompt({
      message: "✏️ New command",
      default: entry.command,
    });

    entry.command = updated;
    if (useFile) {
      aliases[aliasName] = entry;
      await saveToFile(aliases);
    } else {
      await saveToKV(aliasName, entry);
    }

    console.log(`✅ Alias '${aliasName}' updated -> "${updated}"`);
  });

cmd.command("remove [name:string]")
  .description("Remove an alias (fuzzy UI if no name provided)")
  .action(async (options, name?: string) => {
    const useFile = useFileFlag(options);
    const aliases = useFile ? await loadFromFile() : await loadFromKV();
    const keys = Object.keys(aliases);

    if (keys.length === 0) {
      console.log("📭 No aliases defined.");
      return;
    }

    const aliasName = name || await Input.prompt({
      message: "🗑️ Choose alias to remove",
      suggestions: keys,
      list: true,
      info: true,
    });

    if (useFile) {
      delete aliases[aliasName];
      await saveToFile(aliases);
    } else {
      const kv = await Deno.openKv();
      await kv.delete(["alias", aliasName]);
    }

    console.log(`🗑️ Alias '${aliasName}' removed.`);
  });

cmd.command("copy [name:string]")
  .description("Copy alias command to clipboard (fuzzy if name not given)")
  .action(async (options, name?: string) => {
    const useFile = useFileFlag(options);
    const aliases = useFile ? await loadFromFile() : await loadFromKV();
    const keys = Object.keys(aliases);

    if (keys.length === 0) {
      console.log("📭 No aliases defined.");
      return;
    }

    const aliasName = name || await Input.prompt({
      message: "📋 Choose alias to copy",
      suggestions: keys,
      list: true,
      info: true,
    });

    const entry = aliases[aliasName];
    if (!entry) {
      console.error("❌ Alias not found");
      Deno.exit(1);
    }

    await Deno.writeTextFile("/dev/clipboard", entry.command);
    console.log("📋 Copied to clipboard!");
  });
cmd.command("stats [name:string]")
  .description("Show usage stats for all aliases or a specific one")
  .action(async (options, name?: string) => {
    const useFile = useFileFlag(options);
    const aliases = useFile ? await loadFromFile() : await loadFromKV();
    const keys = Object.keys(aliases);

    if (keys.length === 0) {
      console.log("📭 No aliases defined.");
      return;
    }

    const aliasName = name || await Input.prompt({
      message: "📊 Show stats for",
      suggestions: [...keys, "all"],
      list: true,
      info: true,
    });

    if (aliasName === "all") {
      for (const [name, entry] of Object.entries(aliases)) {
        const count = entry.usage?.length ?? 0;
        console.log(`🔹 ${name} — used ${count} time${count === 1 ? "" : "s"}`);
      }
    } else {
      const entry = aliases[aliasName];
      if (!entry) {
        console.error("❌ Alias not found");
        Deno.exit(1);
      }
      const usage = entry.usage ?? [];
      console.log(`📊 Usage for '${aliasName}':`);
      if (usage.length === 0) {
        console.log("  ❕ Never used.");
      } else {
        for (const time of usage) {
          console.log(`  • ${new Date(time).toLocaleString()}`);
        }
      }
    }
  });

await cmd.parse(Deno.args);
