There are 3 nest.js modules here

1. Auth
This is an automation module. Since nest.js + fastify was used, it was not possible to use passport.
Authorization via crypto wallet. Implemented oauth authorization using access and refresh tokens.

2.Invoice
This is the main module of the project. Here is the logic for creating invoices, generating pdfs, and obtaining statistics

3.Notification
Module for sending notifications. A microservice architecture was planned, but a monolith was made for MVP. Therefore, the service was made in such a way that it could easily be separated into a separate microservice