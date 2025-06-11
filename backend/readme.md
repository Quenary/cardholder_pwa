# Frontend part of cardholder_pwa
- ### Preparations
It is recommended to use python virtual environment ```pip install python3-venv```.
You may also need following packages ```pip3 install python-is-python3 python3-dev```.
- ### Run the app
- create venv ```python -m venv venv```
- activate with ```source venv/bin/activate``` or ```venv/scripts/activate```
- install deps ```pip install -r requirements.txt```
- run
    - windows ```$env:DB_URL="sqlite:///./cardholder_pwa.db"; fastapi dev app/main.py```
    - linux ```DB_URL="sqlite:///./cardholder_pwa.db" fastapi dev app/main.py```