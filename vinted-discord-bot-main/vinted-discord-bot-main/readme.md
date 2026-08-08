# Vinted Monitor: No Delay https://www.fyndit.app

Vinted Monitor is a bot that monitors the Vinted items route for new items and notifies users in real-time. It is designed to work with minimal delay, ensuring that users are always up-to-date with the latest items.

<p align="center">
  <a href="https://www.fyndit.app" target="_blank" rel="noopener noreferrer">
    <img src="./doc/promo.png" alt="Example" style="max-height: 400px; width: auto;">
  </a>
</p>

> [!TIP]
> [Discord Invite](https://discord.gg/fyndit) - Join if you want: simply to use the bot freely (with absolute no delay, autobuy (autocop), fast-buy and more features). The fastest bot on the market!

This bot was once upon a time the bot used by the public discord server [Fyndit](https://discord.gg/fyndit) (which is now using a more advanced version of this bot with more features). I keep the repository public for educational purposes and if you want to try to run it by yourself. I'm not responsible if you use it for bad purposes. I haven't maintained it for a while so it might not work as expected. I mainly now focus on the more advanced and private version of a Vinted bot that can be found by [clicking here](https://discord.gg/fyndit) which has a lot more features and works even faster than this public one could have ever dreamed of.

If you would realistically want to run it yourself as of today you would have a cost of around 100EUR/month for proxies and a VPS if you know what you are doing (if you want to have a good speed and avoid skipping items the most you can). If you don't have the money or the time to maintain it, you can simply use the bot for free on the public discord server that you can access by [clicking here](https://discord.gg/fyndit) or even upgrade by subscribing to the premium features for a minimal cost of 14.90EUR/month that gets you acces to all the premium features such as autobuy (autocop), fast-buy, and more.

If you are a community looking for a bot to run for your members, you can also contact me on Discord (teddy_vltn) or here on Whop https://whop.com/fyndit/community-gold/?utm_source=store_page&funnelId=product_4c2b9270-5780-4f55-9923-50dfb40c1987

## Table of Contents
1. [Features](#features)
2. [Requirements](#requirements)
3. [Setup](#setup)
4. [Commands](#commands)
5. [Showcase](#showcase)

## Use the bot for free 

The bot is running for free on a public discord server that you can access (if you don't want to painfully try to install the bot) that can be found by [clicking here](https://discord.gg/fyndit)

It has also much more features than this free old public bot, such as autobuy (autocop), fast-buy, and minimal cost for the premium features. Already more than 2000 users are using it why not you?

## Requirements

> [!NOTE]
> The following bot might not work as expected since I haven't maintained it for a while. If you want a more up-to-date version of this bot with automated features for Vinted the bot that can be found by [clicking here](https://www.fyndit.app)

- VPS running on a Linux kernel or you own computer (avoid Windows if possible)
- Rotating proxy
> [!NOTE]
> You can buy rotating proxies here: [WebShare](https://www.webshare.io/?referral_code=eh8mkj0b6ral) (I get a small cut from that link so please use it if you want to support my work). I would advice you to get the "Verified Proxy" Plan and to take 100 proxy server with 1000 GB/month Bandwidth which is 7.07$/month, but i would highly suggest you take the 250 proxy server and 5000GB plan ($25.73 per month) if you want to have a good speed and avoid skipping items the most you can.
- Docker installed (https://docs.docker.com/engine/install/)
- Some knowledge with Docker, JS and MongoDB
- Git installed (optional)

## Setup

1. Clone the repository from terminal or download through Github.

```bash
git clone https://github.com/teddy-vltn/vinted-discord-bot.git
cd vinted-monitor
```

2. Create a Discord bot in Discord's Developer Portal and invite it to your server:

- Go to the [Discord Developer Portal](https://discord.com/developers/applications).
- Click on "New Application" and give your bot a name.
- Go to the "Bot" tab and click on "Add Bot".
- Copy the "Client ID" and "Token" and paste them into the `.env` file.
- Give intent permissions to the bot by going to the "Bot" tab and enabling the "Presence Intent", "Server Members Intent" and "Content Message Intent".
- Invite the bot with admin permissions to your server by going to the "OAuth2" tab and selecting the "bot" and "application.commands" scope and the "Administrator" permission.
- Copy the generated URL and paste it into your browser to invite the bot to your server.

3. Modify the configuration file `.env` to match your setup by modifying the remaining fields.

4. Make sure you have docker installed on your machine or [Install Docker](https://docs.docker.com/engine/install/) and run the following command:

> [!IMPORTANT]
> If you are on Windows, make sure you have WSL2 alongside Docker Desktop to run the following command. You will also certainly need to activate virtualization in your BIOS.

Make sure the start.sh has permission to execute.
```bash
chmod +x start.sh
```

```bash
./start.sh
```

5. The bot should now be running and ready to use. And enjoy! (if it ain't working you can come to the discord server for help https://discord.gg/fyndit)

?. If you want to stop the bot, you can run the following command:

Make sure the stop.sh has permission to execute.

```bash
chmod +x stop.sh
```

```bash
./stop.sh
```

> [!IMPORTANT]
> If along the way you happen to modify the `.env` file or files in the other folders, you will need to rebuild the docker image by stopping the containers and to start them again.

## Commands

The bot supports a variety of commands that allow users to interact with the bot. Here are some of the available commands:
- `/link_public_channel`: Creates a public channel for the bot to send notifications.
- `/unlink_public_channel`: Unlinks a public channel url.
- `/create_private_channel`: Creates a private channel.
- `/delete_private_channel`: Deletes a private channel.
- `/start_monitoring`: Starts monitoring the Vinted items route.
- `/stop_monitoring`: Stops monitoring the Vinted items route.
- `/set_mentions`: Sets the preferences for mentions in notifications.countries.
- `/info`: Displays information about Channel/User.
- `/set_max_channels`: Sets the maximum number of private channels a user can create.
