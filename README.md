# Ally: AI meeting assistant for Windows

Ally is a personal AI companion for Windows 10 and 11. It listens to your meetings, interviews and calls, suggests short answers to the questions it hears, keeps rolling notes, and can answer from your own PDFs, spreadsheets and documents. Its windows are left out of screen sharing, recordings and screenshots.

**Website:** https://krishanmurariji.github.io/ally-releases/

## Download

Get the latest installer from the [Releases page](https://github.com/krishanmurariji/ally-releases/releases/latest):

- **Ally-Setup.exe**: a small web installer (about 130 KB). It asks how you want to run Ally and downloads only what you choose, showing every size first.
- **All-in-one installer**: a single larger file for offline setup, also on the Releases page.

Windows may show a SmartScreen notice the first time, because the installer is not code-signed yet. Choose **More info**, then **Run anyway**.

## What it does

- **Live answers** during interviews, calls and Q&A, short enough to say out loud.
- **Meeting notes**: summary, decisions, action items and open questions, kept up to date while people talk. Copy them or save a Markdown file.
- **Your documents**: PDF, Excel, CSV, Word and text files (up to 60 MB each). Ally finds the relevant passages and names the file they came from.
- **Modes**: Interview Assistant, Meeting Notes and Summariser, Knowledge Q&A, Sales Call Coach, Customer Support, Lecture and Study Notes, plus modes you create yourself.
- **Automatic updates check** from the Control Center.

## Offline or online

| Setup | How it works | Download |
| --- | --- | --- |
| Offline | Speech recognition (Whisper) and the AI (Ollama models) run on your PC. No account, nothing sent anywhere. | About 245 MB plus the models you choose |
| Online | Claude or ChatGPT with your own API key, encrypted on your PC. | From about 180 MB |
| Custom | Mix and match speech and answer engines. | Sizes shown before anything downloads |

## Requirements

- Windows 10 version 2004 or newer, 64-bit.
- For offline mode, enough RAM and disk space for the models you pick. The installer recommends models that fit your PC.
- For online mode, your own Anthropic (Claude) or OpenAI (ChatGPT) API key.

## Notes

- Some remote-desktop tools behave differently with protected windows. Try Ally before an important call.
- Ally is independent software. Claude and ChatGPT are trademarks of their owners and are used with your own API key.
- Please use Ally only where recording, transcription and AI assistance are allowed.

This repository hosts the public releases and the website. Questions or problems: open an [issue](https://github.com/krishanmurariji/ally-releases/issues).
