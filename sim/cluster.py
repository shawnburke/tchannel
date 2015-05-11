import simpy
from itertools import count

env = simpy.Environment()

class Node(object):
    def __init__(self):
        pass

class Request(object):
    pass

class Alice(object):
    def __init__(self):
        outbound = Store()
    def run():
        while True:
            env.process(self.request())
            yield bob.request(ttl = 1000)
    def request(self):
        yield env.timeout(1000)

def call(*args, **kws):
    return lambda f: f(*args, **kws)

@env.process
@call()
def foo():
    yield env.timeout(100)

env.run()

