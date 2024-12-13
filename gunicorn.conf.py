#gunicorn -c gunicorn.conf.py wsgi:app

import multiprocessing

bind = "0.0.0.0:443"
worker_class = "eventlet"
workers = 1
certfile = "cert.pem"
keyfile = "key.pem"
accesslog = "logs/access.log"
errorlog = "logs/error.log"
