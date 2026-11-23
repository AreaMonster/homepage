/*
  The one list behind cedlabs.net. Each entry creates a homepage area and a
  page at cedlabs.net/<slug>. After editing, run: npm run build
  For a new site, or a changed name, tag, ogText or colour, run npm run og first.

  Required
    slug       Short URL name, using a-z, 0-9 and hyphens
    name       Display name
    url        The real site
    summary    One or two sentences for the homepage
    accent     Main colour, as 6-digit hex such as #6aa8ff

  Optional
    tag        Short label
    ogText     One short line for the social preview image
    linkLabel  Text of the main button
    accent2    Second colour for the artwork, as 6-digit hex
    visual     "waveform", "voxels" or "rings". "rings" suits any new site.
    note       Info box: { label, text }
    join       Copyable server address: { label, address, details }
    links      Extra buttons on the site's page: [{ label, url }]
    page       Page content: { lead, sections, notice }

  Page sections
    { kind: "tiles", title, items: [{ title, text }] }
    { kind: "steps", title, groups: [{ title, steps: [...], note }] }
    Step text can use **bold** and [link text](https://example.com).
*/
module.exports = [
  {
    slug: "tracklog",
    name: "Tracklog",
    tag: "Spotify history analyzer",
    ogText: "Explore your Spotify history, right in your browser.",
    url: "https://tracklog.cedlabs.net",
    linkLabel: "Open Tracklog",
    summary:
      "See your listening time, top artists and tracks, daily rhythm and how your habits changed over the years.",
    accent: "#6aa8ff",
    accent2: "#b48cff",
    visual: "waveform",
    note: {
      label: "Private by design",
      text: "Your Spotify export is analyzed in your browser and never uploaded.",
    },
    page: {
      lead: "Add your extended streaming history from Spotify and explore how you listen, right in your browser.",
      sections: [
        {
          kind: "tiles",
          title: "What you can explore",
          items: [
            { title: "Listening time", text: "See how much time you have spent listening." },
            { title: "Top artists and tracks", text: "Find the artists and songs you played most." },
            { title: "Daily rhythm", text: "See when you tend to listen during the day." },
            { title: "Your years", text: "Follow how your listening habits changed over time." },
          ],
        },
        {
          kind: "steps",
          title: "Get your Spotify data",
          groups: [
            {
              steps: [
                "Open [spotify.com/account/privacy](https://www.spotify.com/account/privacy/) and sign in.",
                "Under **Download your data**, select **Extended streaming history** and request it.",
                "Confirm the request by email. Spotify says delivery can take up to 30 days.",
                "Download the zip from their email and add it to Tracklog. The unzipped JSON files work too.",
              ],
              note: "Tracklog accepts zip or JSON files up to 600 MB. No export yet? You can try it with sample data.",
            },
          ],
        },
        {
          kind: "tiles",
          title: "Your data stays with you",
          items: [
            { title: "Read in your browser", text: "The file is read and analyzed inside your browser tab." },
            { title: "Network requests blocked", text: "The page is served with a policy that blocks it from making network requests." },
            { title: "No tracking", text: "No cookies, no analytics and no third-party requests." },
          ],
        },
      ],
    },
  },
  {
    slug: "areasurvival",
    name: "AreaSurvival",
    tag: "Minecraft server",
    ogText: "Java and Bedrock players, together on one server.",
    url: "https://status-areasurvival.cedlabs.net",
    linkLabel: "View server status",
    summary:
      "A fan-run Minecraft server where Java and Bedrock players play together. See who is online and how reliable it has been.",
    accent: "#58d68d",
    accent2: "#ffd166",
    visual: "voxels",
    join: {
      label: "Server address",
      address: "areasurvival.cedlabs.net",
      details: ["Java 1.8+", "Bedrock, port 19132"],
    },
    links: [{ label: "Discord", url: "https://discord.gg/pjrsWtc42k" }],
    page: {
      lead: "A fan-run Minecraft server where Java and Bedrock players play together.",
      sections: [
        {
          kind: "steps",
          title: "How to join",
          groups: [
            {
              title: "Java Edition",
              steps: [
                "Open Minecraft and click **Multiplayer**.",
                "Click **Add Server** and paste the address.",
                "Click **Done**, then join the server.",
              ],
              note: "Versions 1.8+. No port needed.",
            },
            {
              title: "Bedrock Edition",
              steps: [
                "Tap **Play**, then open the **Servers** tab.",
                "Scroll down and tap **Add Server**.",
                "Enter the address and port **19132**, then save.",
              ],
              note: "Works on Android, iOS and Windows.",
            },
          ],
        },
        {
          kind: "tiles",
          title: "Good to know",
          items: [
            { title: "Crossplay", text: "Java Edition 1.8+ and Bedrock Edition players share the same server." },
            { title: "Live status", text: "The status page checks the server every 30 seconds and shows uptime and player activity." },
            { title: "Community", text: "Join the [AreaSurvival Discord](https://discord.gg/pjrsWtc42k) for announcements and help." },
          ],
        },
      ],
      notice: "A fan-run Minecraft server. Not affiliated with Mojang or Microsoft.",
    },
  },
];
