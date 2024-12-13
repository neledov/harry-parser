import multiprocessing

bind = "0.0.0.0:8443"
worker_class = "eventlet"
workers = 1
certfile = "cert.pem"
keyfile = "key.pem"
accesslog = "logs/access.log"
errorlog = "logs/error.log"
