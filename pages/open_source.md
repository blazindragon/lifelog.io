Open Source
================================================================================
The lifelog platform is open source software. All of its source code is
available under an open source license on [github][1]. This is the same source
code which powers this very website that you are reading this page upon. You are
welcome to read the source code, download it, fork it, edit it, etc. If you make
any improvements which you feel will benefit the project at large, please
contribute them back through a pull request on [github][1].

Contributing
--------------------------------------------------------------------------------
The lifelog platform is in constant need of contributions from people like you.
The project is still in its very early stages and there is still quite a bit
left to do, but we make improvements every day. Even if you can't program, you
can still contribute to its development. Here are a few ways that you can help
out.

- **Sending Patches**: if you can program, you are more than welcome to submit
pull requests on [github][1]. We will be happy to accept your patch into the
source code. If you do send in a patch for a particularly noteworthy feature,
we'll also blog about it.
- **Bug Reports**: filing bug reports is a great way to let us know what is
broken. Bug reports are collected through the issue tracker on the [github][1]
repository in question.
- **Documentation**: the lifelog platform is in constant need of documentation.
We have tried to provide as much documentation as we can, but feel free to add
more. Documentation is submitted through pull requests on [github][1] on the
[lifelog.io][3] repository.
- **Artwork and Design**: if you can't alredy tell, the people behind this website aren't
designers. We need serious help here.

Architecture
--------------------------------------------------------------------------------
The lifelog platform started as a side project for its founder to solve a real
problem he had, but also as an experiment into a different kind of web
application architecture than the norm of the time. It is made up of many
individual components which each do one thing really well; the lifelog platform
attempts to follow the
[unix philosophy](http://en.wikipedia.org/wiki/Unix_philosophy).

Specifically, the lifelog platform is comprised of the following components:

- [lifelogd][2]: a small FastCGI backend that serves a simple [REST][4] json API
- [lifelog.io][3]: a simple web frontend for the lifelogd backend

The frontend and backend have been purposefully separated. This allows the
backend to not know, nor care about, anything frontend related; the backend
remains purely an api provider. Any external system which implements that api
can now interface with the backend just. The frontend must implement the same
api that a command line client or a mobile application would.

A separation may seem counter-intuitive at first. After all, projects like
[Django](https://www.djangoproject.com) and
[Ruby on Rails](http://www.rubyonrails.org) bundle both the frontend and backend
together into one framework. However, the separation means that the frontend
receives no special treatment; every api consumer is a first class citizen and
has access to every feature through the same methods that the web frontend uses.
A separation is closer to the unix philosophy and has massive implications on
productivity, correctness, and maintainability of the software in question.

[lifelogd][2] Backend
--------------------------------------------------------------------------------
The lifelogd backend is a small FastCGI backend which serves a simple [REST][4]
json api to uesrs. It is written in [go](http://www.golang.org) for the many
benefits it provides:

- Single, statically linked binaries provide simple rollbacks and avoid runtime
[dependency hell](http://en.wikipedia.org/wiki/Dependency_hell)
- Static type checking
- [Benchmarked](http://matt.aimonetti.net/posts/2013/06/23/using-go-vs-ruby-for-web-apis)
to be much faster than ruby or python in production. However, take benchmarks
with a pinch of salt.
- High productivity through a simple syntax and rich standard library

The lifelogd backend sits behind a FastCGI interface to a web server. This
allows for many operational and architectural advantages.

- Allows the lifelogd backend to focus on its application. The core web server
can focus on being HTTP compliant. Plus, it will be much more efficient at
serving files than the lifelogd backend can ever hope to be.
- Isolation from the core web server; bugs in the lifelogd backend cannot bring
the core web server down
- FastCGI daemons can run anywhere within the network, e.g on separate a machine
- Many web servers, e.g. lighttpd or nginx, have built in FastCGI load balancing

[lifelog.io][3] Web Frontend
--------------------------------------------------------------------------------
The lifelog.io web frontend is a consumer of the lifelogd backend api. It is
written in Javascript using [AngularJs](http://www.angularjs.org). As the
AngularJs homepage states, "HTML is great for declaring static documents, but it
falters when we try to use it for declaring dynamic views in web-applications."
AngularJs fixes that by returning dynamic webpages to being built with
declarative HTML. Were HTML to have been invented today, it might have looked a
little like AngularJs.

[1]: http://www.github.com/lifelog
[2]: http://www.github.com/lifelog/lifelogd
[3]: http://www.github.com/lifelog/lifelog.io
[4]: http://en.wikipedia.org/wiki/Representational_state_transfer
