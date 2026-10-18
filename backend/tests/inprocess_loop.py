"""Test-only asyncio loop for HTTPX's in-process ASGI transport.

Uses a threading.Event for cross-thread wakeups, so it requires no socketpair.
No network or file transports are supported. Application/server code is unchanged.
This lets API contract tests run in restricted Windows environments where even
asyncio's internal TCP socketpair cannot connect. Live Uvicorn still needs sockets.
"""
import asyncio
import selectors
from threading import Event


class EventSelector(selectors.SelectSelector):
    def __init__(self, wakeup):
        super().__init__()
        self.wakeup = wakeup

    def select(self, timeout=None):
        if self.get_map():
            raise RuntimeError("In-process test loop does not support I/O transports")
        self.wakeup.wait(timeout)
        self.wakeup.clear()
        return []


class InProcessEventLoop(asyncio.SelectorEventLoop):
    def __init__(self):
        self.wakeup = Event()
        super().__init__(selector=EventSelector(self.wakeup))

    def _make_self_pipe(self):
        pass

    def _write_to_self(self):
        self.wakeup.set()

    def _close_self_pipe(self):
        pass
