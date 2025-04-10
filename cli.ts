import { Command } from "https://jsr.io/@cliffy/command/1.0.0-rc.7/mod.ts";
import { CompletionsCommand } from "https://jsr.io/@cliffy/command/1.0.0-rc.7/completions/mod.ts";
import { Input } from "https://jsr.io/@cliffy/prompt/1.0.0-rc.7/mod.ts";
import { join } from "jsr:@std/path@~1.0.6";

const HOME = Deno.env.get("HOME") || Deno.env.get("USERPROFILE");
if (!HOME) {
  console.error(
    "❌ Cannot determine home directory. Please set $HOME or run with --allow-env",
  );
  Deno.exit(1);
}
const ALIAS_PATH = join(HOME, ".my-cli-aliases.json");

type AliasEntry = {
  command: string;
  favorite?: boolean;
  usage?: string[];
};

type Aliases = Record<string, AliasEntry>;

async function loadAliases(): Promise<Aliases> {
  try {
    const content = await Deno.readTextFile(ALIAS_PATH);
    const parsed = JSON.parse(content);
    // Если это старый формат — мигрируем
    if (typeof Object.values(parsed)[0] === "string") {
      const migrated: Aliases = {};
      for (const [k, v] of Object.entries(parsed)) {
        migrated[k] = {
          command: v as string,
          favorite: false,
          usage: [],
        };
      }
      await saveAliases(migrated);
      return migrated;
    }
    return parsed;
  } catch {
    return {};
  }
}

async function saveAliases(aliases: Aliases): Promise<void> {
  await Deno.writeTextFile(ALIAS_PATH, JSON.stringify(aliases, null, 2));
}

function recordUsage(alias: AliasEntry) {
  if (!alias.usage) alias.usage = [];
  alias.usage.push(new Date().toISOString());
}

// CLI и команды

const cmd = new Command()
  .name("alias")
  .version("0.2.0")
  .description("Alias manager CLI with fuzzy search");

cmd
  .command("add <name:string> <command:string>")
  .description("Add a new alias")
  .action(async (_options, name, command) => {
    const aliases = await loadAliases();
    aliases[name] = {
      command,
      favorite: false,
      usage: [],
    };
    await saveAliases(aliases);
    console.log(`✅ Alias '${name}' added -> "${command}"`);
  });

cmd
  .command("run [name:string]")
  .description("Run an alias (with optional fuzzy UI)")
  .action(async (_options, name?: string) => {
    const aliases = await loadAliases();
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

    recordUsage(entry);
    await saveAliases(aliases);
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

cmd
  .command("list")
  .description("List all aliases")
  .action(async () => {
    const aliases = await loadAliases();
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

cmd
  .command("ui")
  .description("Fuzzy search and run aliases interactively")
  .action(async () => {
    const aliases = await loadAliases();
    const names = Object.keys(aliases);
    if (names.length === 0) {
      console.log("📭 No aliases to run.");
      return;
    }

    const selected = await Input.prompt({
      message: "🔍 Type alias name",
      suggestions: names,
      list: true,
      info: true,
    });

    const entry = aliases[selected];
    if (!entry) {
      console.log(`❌ Alias '${selected}' not found.`);
      return;
    }

    recordUsage(entry);
    await saveAliases(aliases);
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

cmd.command("completions", new CompletionsCommand())
  .description("Generate shell completions");

await cmd.parse(Deno.args);
