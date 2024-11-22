# HARRY - HAR File Analyzer 🧙‍♂️

Efficiently analyze your HAR files.

## Features 🎩

- **HAR file upload** 
- **Request/response analysis** 
- **SAML/SSO detection** 
- **Timeline visualization**
- **Advanced filters**:
  - **HTTP methods** 
  - **Status codes**
  - **Content types** 
  - **SAML flows** 
  - **Error requests** 
- **Syntax highlighting** 
- **cURL generation** 
- **Certificate analysis** 
- **Multi-user support** 

## Tech Stack 🎨

- **Backend**: Python / Flask
- **Frontend**: JavaScript
- **Database**: SQLite
- **UI**: Custom CSS
- **Libraries**:
  - Chart.js
  - Prism.js
  - Font Awesome

## Installation 🚀

**Clone the repository:**

```bash
git clone https://github.com/neledov/harry-parser.git
cd harry-parser
```

**Create a virtual environment:**

For Linux/Mac:

```bash
python -m venv venv
source venv/bin/activate
```

For Windows:

```bash
python -m venv venv
venv\Scripts\activate
```

**Install dependencies:**

```bash
pip install -r requirements.txt
```

**Initialize the database:**

```bash
flask db init
flask db migrate
flask db upgrade
```

**Launch the application:**

```bash
python3 app.py
```

Access at `http://localhost:5000`.

## Project Structure 🏰

```
harry-parser/
├── app.py          # Main app
├── models.py       # Data models
├── static/         # Static assets
│   ├── css/        # Stylesheets
│   └── js/         # JavaScript
├── templates/      # HTML templates
├── uploads/        # HAR files
└── logs/           # Logs
```

## Environment Variables 🧪

Create a `.env` file:

```env
SECRET_KEY=your_secret_key
FLASK_ENV=development
```

## Development 🛠️

- Clean Python code.
- Modern JavaScript (ES6+).
- Responsive CSS.
- Thorough documentation.
- Update dependencies.

## License 📜

MIT License

## Author 🧙‍♂️

**Anton Neledov**

- **GitHub**: [neledov](https://github.com/neledov/harry-parser)
- **Status**: HAR Parser Developer

---