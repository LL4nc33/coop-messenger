package main

import (
	"fmt"
	"os"
	"runtime"

	"github.com/urfave/cli/v2"
	"heckel.io/ntfy/v2/cmd"
)

// These variables are set during build time using -ldflags
var (
	version = "dev"
	commit  = "unknown"
	date    = "unknown"
)

func main() {
	cli.AppHelpTemplate += fmt.Sprintf(`
Coop Messenger - A self-hosted, cooperative messenger.
https://github.com/LL4nc33/coop-messenger

To report a bug, open an issue on GitHub: https://github.com/LL4nc33/coop-messenger/issues

coop %s (%s), runtime %s, built at %s
Based on ntfy by Philipp C. Heckel | Licensed under AGPL-3.0
`, version, maybeShortCommit(commit), runtime.Version(), date)

	app := cmd.New()
	app.Version = version
	app.Metadata = map[string]any{
		cmd.MetadataKeyDate:   date,
		cmd.MetadataKeyCommit: commit,
	}

	if err := app.Run(os.Args); err != nil {
		fmt.Fprintln(os.Stderr, err.Error())
		os.Exit(1)
	}
}

func maybeShortCommit(commit string) string {
	if len(commit) > 7 {
		return commit[:7]
	}
	return commit
}
