# HARRY - HAR File Analyzer 🧙‍♂️

Because analyzing HAR files should be magical! ✨

## Features 🎩

- **HAR file upload and management** — making your life easier one file at a time.
- **Detailed request/response analysis** — we dive deep into every HTTP detail.
- **SAML/SSO flow detection** — catching those elusive authentication flows.
- **Request timeline visualization** — better than scrolling through your ex's Instagram.
- **Advanced filtering capabilities** — because more options mean better insights:
  - HTTP methods (GET, POST, or whatever tickles your fancy)
  - Status codes (from cheerful 200s to gloomy 500s)
  - Content types (JSON, XML, or even hieroglyphs)
  - SAML flows — for the security enthusiasts
  - Error requests — when things go "boom" 💥
- **Syntax highlighting** — making your code look fabulous.
- **cURL command generation** — copy-paste like a pro.
- **Certificate analysis** — we've got trust issues covered.
- **Multi-user support** — collaborate and conquer.
- **Dark theme UI** — because who doesn't love the dark side?

## Tech Stack 🎨

- **Backend**: Python/Flask
- **Frontend**: Vanilla JavaScript
- **Database**: SQLite
- **UI**: Custom CSS
- **Libraries**:
  - Chart.js — for those slick graphs
  - Prism.js — adding color to your code
  - Font Awesome — because icons speak louder than words

## Installation 🚀

**Clone the repository:**

```bash
git clone https://github.com/neledov/harry-parser.git
cd harry-parser  # Step into the magic
```

**Create your virtual environment:**

For Linux/Mac:

```bash
python -m venv venv  # Your personal sanctuary
source venv/bin/activate  # Activate the virtual environment
```

For Windows:

```bash
python -m venv venv  # Your personal sanctuary
venv\Scripts\activate  # Activate the virtual environment
```

**Install the dependencies:**

```bash
pip install -r requirements.txt  # Gather all the essentials
```

**Initialize the database:**

```bash
flask db init
flask db migrate
flask db upgrade
```

**Launch the application:**

```bash
flask run  # Let the show begin!
```

🎉 **Your portal will open at** `http://localhost:5000`

## Project Structure 🏰

```
harry-parser/
├── app.py            # The core of the application
├── models.py         # Data models
├── static/           # Static files
│   ├── css/          # Stylesheets
│   └── js/           # JavaScript files
├── templates/        # HTML templates
├── uploads/          # Uploaded files
└── logs/             # Log files
```

## Environment Variables 🧪

Create your `.env` file:

```env
SECRET_KEY=your_super_secret_key
FLASK_ENV=development  # or 'production' if you're feeling adventurous
```

## Usage 🎮

1. **Join the wizard academy** — register an account.
2. **Enter the magical realm** — log in.
3. **Upload your HAR files** — let's get started.
4. **Analyze the HTTP data** — uncover the secrets.
5. **Filter through the chaos** — find exactly what you're looking for.
6. **Share your magical commands** — generate cURL commands.

## Development 🛠️

- Keep your Python code clean and efficient.
- Use modern JavaScript (ES6+).
- Craft CSS that even Merlin would applaud.
- Document your code for future adventurers.
- Keep your tools sharp and up-to-date.

## License 📜

MIT License

## Author 🧙‍♂️

**Anton Neledov**

- **GitHub**: [here](https://github.com/neledov/harry-parser)
- **Status**: Professional HAR Whisperer

---