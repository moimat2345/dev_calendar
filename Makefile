.PHONY: dev build start install db-push db-migrate db-studio db-reset generate clean fclean kill

# Development
dev:
	npx next dev

build:
	npx next build

start:
	npx next start

install:
	npm install

# Database
db-push:
	npx prisma db push

db-migrate:
	npx prisma migrate dev

db-studio:
	npx prisma studio

db-reset:
	npx prisma migrate reset

generate:
	npx prisma generate

# Utilities
kill:
	@lsof -ti:3000 | xargs kill -9 2>/dev/null; echo "Port 3000 cleared"

clean:
	rm -rf .next node_modules/.cache

fclean: clean
	rm -rf node_modules
	npx prisma migrate reset --force
