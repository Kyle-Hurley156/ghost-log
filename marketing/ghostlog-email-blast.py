#!/usr/bin/env python3
"""
GhostLog outreach emails via Gmail API.
Targets: fitness bloggers, app reviewers, personal trainers, gym owners, fitness influencers.
"""
import os, base64, json, time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/gmail.send']
TOKEN = os.path.expanduser('~/gmail-env/token_send.json')
FROM = 'Kyle Hurley <kylehurley156@gmail.com>'
SENT_LOG = os.path.join(os.path.dirname(__file__), 'ghostlog-sent.json')

SIGNATURE = """
—
Kyle Hurley
Developer, GhostLog
ghostlogapp@gmail.com
0455 774 047"""


def body_reviewer(name):
    return f"""Hi {name},

I built GhostLog — an AI fitness + nutrition tracker for iOS and Android.

It does things I haven't seen any other fitness app do:

  - Snap a photo of any meal and AI returns the macros instantly
  - Ghost Chef: tell it what you're craving and it generates a recipe
    that fits your remaining macro budget
  - Ghost Report: AI weekly analysis of your training volume, recovery
    trends, and nutrition patterns
  - Full workout logger with custom splits, sets/reps/weight tracking
  - Barcode scanner that pulls from OpenFoodFacts
  - Daily check-in (weight, sleep, stress, water, steps)
  - Cloud sync across devices

Built solo by a 20yo engineering student in Brisbane. I'd love for you
to try it and share your honest thoughts with your audience.

Happy to provide a free promo code for GhostLog Pro if you'd like to
review the full feature set.

Would you be interested in checking it out?
{SIGNATURE}"""


def body_trainer(name):
    return f"""Hi {name},

Quick question — do your clients track their macros and workouts
consistently? Or do they show up to sessions without knowing what
they ate yesterday?

I built GhostLog — an AI fitness app that makes tracking dead simple:

  - Clients snap a photo of their food and AI returns the macros
  - Full workout logger they can use during your sessions or on
    their own
  - You can see their weekly Ghost Report — AI analysis of training
    volume, recovery, and nutrition compliance
  - Barcode scanner + meal builder for precise logging

I'm not asking you to sell it. I'm asking if it would make your
clients better.

It's free to download with a $9.70/mo Pro tier for the AI features.
Happy to give you and your clients free Pro access to try it.

Worth a look?
{SIGNATURE}"""


def body_gym(name):
    return f"""Hi {name},

GhostLog is an AI fitness + nutrition tracker that I built for serious
gym-goers. It's on iOS and Android.

The reason I'm reaching out: I think your members would love it.

  - Photo-to-macros: snap a pic of any meal, AI returns calories and
    macros in seconds
  - Ghost Chef: generates recipes that fit remaining macro budget
  - Full workout logger with custom splits and programs
  - Barcode scanner for packaged foods
  - Weekly AI report on training volume and recovery

I'm not asking for a partnership or sponsorship — just wondering if
you'd be open to mentioning it to members who are already tracking
their nutrition manually (spreadsheets, MyFitnessPal, etc).

Happy to set up a demo or provide free Pro access for your trainers
to evaluate.

Cheers,
{SIGNATURE}"""


def body_influencer(name):
    return f"""Hey {name},

I built an AI fitness app called GhostLog and I think your audience
would genuinely find it useful.

The standout feature: you take a photo of ANY food and the AI returns
the macros instantly. No searching, no manual entry, no guessing.

It also has:
  - Ghost Chef (tell it what you're craving, it generates a macro-
    friendly recipe)
  - Ghost Report (weekly AI analysis of your training + nutrition)
  - Full workout + cardio logger
  - Barcode scanner
  - Clean black & white design

I'd love to give you free lifetime Pro access in exchange for an
honest review — TikTok, YouTube, Instagram, whatever works for you.
No script, just your real reaction.

Interested?
{SIGNATURE}"""


BODY_MAP = {
    "reviewer": body_reviewer,
    "trainer": body_trainer,
    "gym": body_gym,
    "influencer": body_influencer,
}

# === TARGETS ===
TARGETS = [
    # App review sites
    {"to": "tips@appadvice.com", "name": "AppAdvice team", "type": "reviewer", "subject": "AI fitness app that scans food photos for macros — review copy available"},
    {"to": "hello@makeuseof.com", "name": "MakeUseOf team", "type": "reviewer", "subject": "New AI fitness app — photo-to-macros + AI meal generator"},
    {"to": "tips@lifehacker.com.au", "name": "Lifehacker AU team", "type": "reviewer", "subject": "Aussie-built AI fitness app — snap food photos, get instant macros"},
    {"to": "editorial@techradar.com", "name": "TechRadar team", "type": "reviewer", "subject": "GhostLog — AI fitness app with photo-to-macro scanning"},
    {"to": "tips@9to5mac.com", "name": "9to5Mac team", "type": "reviewer", "subject": "New iOS fitness app with AI food scanning — review build available"},
    {"to": "news@androidpolice.com", "name": "Android Police team", "type": "reviewer", "subject": "GhostLog for Android — AI fitness tracker with food photo scanning"},
    {"to": "hello@idownloadblog.com", "name": "iDownloadBlog team", "type": "reviewer", "subject": "AI-powered fitness app for iOS — photo scanning + macro tracking"},
    {"to": "tips@cultofmac.com", "name": "Cult of Mac team", "type": "reviewer", "subject": "GhostLog — AI fitness app built solo by a 20yo Aussie dev"},
    {"to": "contact@appleinsider.com", "name": "AppleInsider team", "type": "reviewer", "subject": "New AI fitness app — Ghost Chef generates recipes from your macro budget"},
    {"to": "hello@producthunt.com", "name": "Product Hunt team", "type": "reviewer", "subject": "GhostLog — AI fitness tracker launching soon, seeking hunter"},

    # Fitness bloggers / sites
    {"to": "info@bodybuilding.com.au", "name": "Bodybuilding AU team", "type": "reviewer", "subject": "AI macro tracking app — snap a photo, get instant macros"},
    {"to": "hello@fitnessfirst.com.au", "name": "Fitness First team", "type": "gym", "subject": "Free AI fitness app for your members — GhostLog"},
    {"to": "info@anytimefitness.com.au", "name": "Anytime Fitness team", "type": "gym", "subject": "AI nutrition tracker your members will love — free to try"},
    {"to": "enquiries@f45training.com.au", "name": "F45 team", "type": "gym", "subject": "AI macro tracker for F45 members — photo scanning + workout logger"},
    {"to": "info@plusfitness.com.au", "name": "Plus Fitness team", "type": "gym", "subject": "Free AI fitness app for your gym members"},
    {"to": "hello@goldsgymbris.com.au", "name": "Gold's Gym Brisbane team", "type": "gym", "subject": "AI fitness app built in Brisbane — GhostLog for your members"},
    {"to": "info@goodlifehealthclubs.com.au", "name": "Goodlife team", "type": "gym", "subject": "AI nutrition + workout tracker for Goodlife members"},
    {"to": "info@worldgym.com.au", "name": "World Gym team", "type": "gym", "subject": "GhostLog — AI fitness app your members will actually use"},

    # Personal trainers / coaches (AU)
    {"to": "hello@cleanhealth.com.au", "name": "Clean Health team", "type": "trainer", "subject": "AI macro tracker for your PT clients — GhostLog"},
    {"to": "info@australianinstituteoffitness.com.au", "name": "AIF team", "type": "trainer", "subject": "AI fitness app for personal trainers — free Pro access"},
    {"to": "enquiries@fitnessaustralia.com.au", "name": "Fitness Australia team", "type": "trainer", "subject": "AI-powered client tracking app for Australian PTs"},
    {"to": "hello@ptacademy.com.au", "name": "PT Academy team", "type": "trainer", "subject": "GhostLog — AI app that helps PT clients track macros automatically"},
    {"to": "info@nutritionaustralia.org", "name": "Nutrition Australia team", "type": "reviewer", "subject": "AI nutrition app — photo scanning returns instant macros"},

    # Fitness influencer emails (general)
    {"to": "business@jeffnippard.com", "name": "Jeff Nippard team", "type": "influencer", "subject": "AI fitness app — photo-to-macros + AI meal generator — review offer"},
    {"to": "hello@natacha-oceane.com", "name": "Natacha team", "type": "influencer", "subject": "AI fitness app with instant food photo scanning — free Pro access"},
    {"to": "info@buffbunny.com", "name": "BuffBunny team", "type": "influencer", "subject": "GhostLog — AI fitness app your audience will love"},

    # Australian fitness media
    {"to": "editorial@womenshealthmag.com.au", "name": "Women's Health AU team", "type": "reviewer", "subject": "AI fitness app from Brisbane — snap food photos for instant macros"},
    {"to": "editorial@menshealth.com.au", "name": "Men's Health AU team", "type": "reviewer", "subject": "AI-powered fitness app built by a 20yo Aussie — GhostLog"},
    {"to": "editorial@bodyandsoul.com.au", "name": "Body+Soul team", "type": "reviewer", "subject": "New AI fitness app — take a photo, get instant nutrition info"},
    {"to": "info@insidefitnessmagazine.com.au", "name": "Inside Fitness team", "type": "reviewer", "subject": "GhostLog — AI fitness tracker with Ghost Chef meal generator"},
    {"to": "hello@coachmagazine.com.au", "name": "Coach Magazine team", "type": "reviewer", "subject": "AI fitness app review opportunity — GhostLog"},

    # Tech media AU
    {"to": "tips@gizmodo.com.au", "name": "Gizmodo AU team", "type": "reviewer", "subject": "Aussie-built AI fitness app — photo-to-macros in seconds"},
    {"to": "editorial@techaustralia.com.au", "name": "Tech Australia team", "type": "reviewer", "subject": "GhostLog — AI fitness app built solo in Brisbane"},
    {"to": "hello@startupdaily.net", "name": "Startup Daily team", "type": "reviewer", "subject": "Solo dev ships AI fitness app to iOS + Android — GhostLog"},
    {"to": "tips@smartcompany.com.au", "name": "SmartCompany team", "type": "reviewer", "subject": "20yo Brisbane dev builds AI fitness app with 8 features in 2 weeks"},
]


def load_sent():
    try: return json.load(open(SENT_LOG))
    except: return []

def save_sent(sent):
    with open(SENT_LOG, "w") as f: json.dump(sent, f, indent=2)


def main():
    print(f"\n{'='*60}")
    print(f"  GHOSTLOG EMAIL BLAST — {len(TARGETS)} targets")
    print(f"{'='*60}\n")

    creds = Credentials.from_authorized_user_file(TOKEN, SCOPES)
    if not creds.valid and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    svc = build('gmail', 'v1', credentials=creds)

    sent = load_sent()
    sent_emails = {e["to"].lower() for e in sent}
    fresh = [t for t in TARGETS if t["to"].lower() not in sent_emails]
    print(f"  Fresh: {len(fresh)} (skipping {len(TARGETS) - len(fresh)} already sent)\n")

    count = 0
    for i, t in enumerate(fresh):
        body_fn = BODY_MAP.get(t["type"], body_reviewer)
        body = body_fn(t["name"])

        msg = MIMEMultipart()
        msg['from'] = FROM
        msg['to'] = t['to']
        msg['subject'] = t['subject']
        msg.attach(MIMEText(body, 'plain'))

        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        try:
            result = svc.users().messages().send(userId='me', body={'raw': raw}).execute()
            count += 1
            sent.append({"to": t["to"], "subject": t["subject"], "type": t["type"],
                        "time": time.strftime("%Y-%m-%dT%H:%M:%S"), "msg_id": result["id"]})
            save_sent(sent)
            print(f"  [{i+1}/{len(fresh)}] SENT -> {t['to']}")
            time.sleep(2)
        except Exception as e:
            err = str(e)
            print(f"  [{i+1}/{len(fresh)}] FAILED -> {t['to']}: {err[:120]}")
            if "rate limit" in err.lower() or "quota" in err.lower():
                print("  Rate limited — stopping")
                break
            time.sleep(3)

    print(f"\n{'='*60}")
    print(f"  DONE — Sent {count}/{len(fresh)} GhostLog emails")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
