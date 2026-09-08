---
title: "Frameworks & Ecosystem"
description: "Django, Flask, FastAPI, Pandas, and Python testing tools."
---

## 1. What is the difference between Django and Flask?
- **Django**: A "batteries-included" full-stack web framework. It comes with a built-in ORM, admin panel, authentication, and directory structure. Follows MVT (Model-View-Template). Best for large, complex applications.
- **Flask**: A "microframework". It provides only the bare minimum to get a web server running (routing and templating). You must choose and install third-party libraries for databases, auth, etc. Best for small apps or APIs.

## 2. What is FastAPI?
A modern, high-performance web framework for building APIs with Python 3.6+ based on standard Python type hints. It is incredibly fast (comparable to NodeJS/Go), heavily utilizes `asyncio`, and automatically generates interactive API documentation (Swagger UI).

```python
from fastapi import FastAPI
app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}
```

## 3. Explain the Django MVT Architecture.
- **Model**: Defines the database schema using Python classes (ORM).
- **View**: Contains the business logic. It receives the HTTP request, queries the Model, and passes data to the Template.
- **Template**: The HTML files that control the presentation logic.

## 4. What is an ORM (Object-Relational Mapping)?
A programming technique that allows you to interact with a SQL database using object-oriented code (Python classes) instead of writing raw SQL queries. Django ORM and SQLAlchemy are the most popular in Python.

```python
# Django ORM Example
users = User.objects.filter(age__gt=18)
```

## 5. What is SQLAlchemy?
The most popular ORM for Flask and general Python applications. It provides a full suite of enterprise-level persistence patterns and is highly flexible, allowing you to drop down to raw SQL when necessary.

## 6. What is NumPy?
A fundamental library for scientific computing in Python. It provides support for large, multi-dimensional arrays and matrices, along with a vast collection of high-level mathematical functions to operate on these arrays quickly (written in C).

```python
import numpy as np
arr = np.array([1, 2, 3])
print(arr * 2) # [2, 4, 6] (Vectorized operation)
```

## 7. What is Pandas?
A data manipulation and analysis library built on top of NumPy. It provides data structures like `DataFrame` (2D tabular data, like an Excel sheet) and `Series` (1D data) which make handling, cleaning, and aggregating data incredibly easy.

```python
import pandas as pd
df = pd.read_csv('data.csv')
print(df.head())
```

## 8. What is Scikit-Learn?
The industry standard library for traditional Machine Learning in Python. It provides simple and efficient tools for classification, regression, clustering, and dimensionality reduction (e.g., Random Forests, SVMs, K-Means).

## 9. What is the difference between PyTorch and TensorFlow?
Both are Deep Learning frameworks.
- **TensorFlow** (Google): Historically more complex, uses static computation graphs (though TF2 adopted eager execution). Highly suited for production deployment and mobile (`TFLite`).
- **PyTorch** (Meta): Highly "Pythonic", uses dynamic computation graphs (eager execution). It is the preferred choice for researchers due to its flexibility and debugging ease.

## 10. What is a Virtual Environment?
An isolated Python environment that allows you to install packages specific to a project without affecting the global Python installation. This prevents version conflicts between different projects (e.g., Project A needs Django 2.0, Project B needs Django 4.0).

## 11. How do you create and activate a Virtual Environment?
Using the built-in `venv` module.

```bash
# Create
python -m venv myenv

# Activate (Windows)
myenv\Scripts\activate

# Activate (Mac/Linux)
source myenv/bin/activate
```

## 12. What is `pip`?
The standard package manager for Python. It allows you to install and manage additional libraries that are not part of the Python standard library, fetching them from the Python Package Index (PyPI).

```bash
pip install requests
```

## 13. What is a `requirements.txt` file?
A text file containing a list of all the pip packages (and their specific versions) required to run a project. You can install all dependencies at once using `pip install -r requirements.txt`.

```text
Flask==2.0.1
requests>=2.25.0
```

## 14. What are `unittest` and `pytest`?
- **unittest**: The built-in testing framework in Python. Requires you to write tests inside classes inheriting from `unittest.TestCase`.
- **pytest**: The most popular third-party testing framework. It requires less boilerplate, allows writing tests as simple functions, and provides highly readable assert outputs.

```python
# pytest example
def test_addition():
    assert 1 + 1 == 2
```

## 15. What is `requests`?
A deeply popular third-party library that makes sending HTTP requests (GET, POST, etc.) incredibly simple and human-readable compared to the built-in `urllib`.

```python
import requests
response = requests.get('https://api.github.com')
print(response.json())
```

## 16. What is `BeautifulSoup`?
A library used for web scraping purposes. It pulls data out of HTML and XML files, allowing you to navigate the parse tree to find specific tags and text easily.

## 17. What is Celery?
An asynchronous task queue/job queue based on distributed message passing. It is used in web applications to offload heavy, time-consuming tasks (like sending bulk emails or video processing) to background worker processes so the main web server isn't blocked.

## 18. What is Jupyter Notebook?
An open-source web application that allows you to create and share documents that contain live code, equations, visualizations, and narrative text. It is heavily used in Data Science and Machine Learning for exploratory data analysis.

## 19. What is `Poetry`?
A modern tool for dependency management and packaging in Python. It replaces `requirements.txt`, `setup.py`, and `venv` by managing dependencies deterministically using a `pyproject.toml` file and a lock file.

## 20. What is Flake8 / Black?
- **Flake8**: A linter that checks your code against PEP 8 style guidelines and programming errors.
- **Black**: An uncompromising code formatter. It automatically reformats your code to adhere to strict style rules, ending debates about formatting.
