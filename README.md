# HARRY - HAR File Analyzer 🧙‍♂️

Because analyzing HAR files should be magical! ✨

## Features 🎩

- **HAR file upload and management** (like magic, but with more clicks)
- **Detailed request/response analysis** (we peek into every HTTP secret)
- **SAML/SSO flow detection** (catches those sneaky authentication flows)
- **Request timeline visualization** (prettier than your ex's Instagram feed)
- **Advanced filtering capabilities** (because who doesn't love options?):
  - HTTP methods (GET, POST, or whatever floats your boat)
  - Status codes (from happy 200s to sad 500s)
  - Content types (JSON, XML, or ancient hieroglyphs)
  - SAML flows (for the security wizards)
  - Error requests (when things go boom 💥)
- **Syntax highlighting** (making your code look fabulous)
- **cURL command generation** (copy-paste like a pro)
- **Certificate analysis** (trust issues? We got you covered)
- **Multi-user support** (play nice with others)
- **Dark theme UI** (because we're not savages)

## Tech Stack 🎨

- **Backend**: Python/Flask (snakes are cool)
- **Frontend**: Vanilla JavaScript (keeping it pure and simple)
- **Database**: SQLite (lightweight champion)
- **UI**: Custom CSS (handcrafted with love)
- **Libraries** (our magical ingredients):
  - Chart.js (making lines go up and down)
  - Prism.js (rainbow code, anyone?)
  - Font Awesome (because icons speak louder than words)

## Installation 🚀

**Summon the repository:**

```bash
git clone https://github.com/antonneledov/harry.git
cd harry  # Enter the chamber of secrets
```

**Create your magical environment:**

For Linux/Mac wizards:

```bash
python -m venv venv  # Your personal sanctuary
source venv/bin/activate  # Activate the virtual environment
```

For Windows sorcerers:

```bash
python -m venv venv  # Your personal sanctuary
venv\Scripts\activate  # Activate the virtual environment
```

**Gather the magical dependencies:**

```bash
pip install -r requirements.txt  # Collect all the spells
```

**Initialize your crystal ball (database):**

```bash
flask db init
flask db migrate
flask db upgrade
```

**Launch the magic:**

```bash
flask run  # Let the show begin!
```

🎉 **Your magical portal will open at** `http://localhost:5000`

## Project Structure 🏰

```
harry/
├── app.py            # The spell book
├── models.py         # Magical creatures
├── static/           # Treasure chamber
│   ├── css/          # Beauty potions
│   └── js/           # Magic wands
├── templates/        # Scroll collection
├── uploads/          # Dragon's vault
└── logs/             # Crystal ball recordings
```

## Environment Variables 🧪

Brew your `.env` potion:

```env
SECRET_KEY=your_super_secret_spell
FLASK_ENV=development  # or production if you're brave
```

## Usage 🎮

1. **Join the wizard academy** (register)
2. **Enter the magical realm** (login)
3. **Upload your HAR scrolls**
4. **Analyze the ancient HTTP runes**
5. **Filter through the chaos**
6. **Share your magical commands** (cURL)

## Development 🛠️

- Keep your Python as clean as your wand
- JavaScript from the future (ES6+)
- CSS that would make Merlin proud
- Document like you're writing for future wizards
- Keep your magical tools sharp and updated

## License 📜

MIT License (Magic Is Tremendous)

## Author 🧙‍♂️

**Anton Neledov**

- **GitHub**: [here](https://github.com/neledov/harry-parser)
- **Status**: Professional HAR Whisperer