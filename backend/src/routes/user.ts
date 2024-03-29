import { PrismaClient } from "@prisma/client/edge";

import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { signInInput, signupInput } from "@siddhant001/common";
const secret = "mySecretKey";


export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
  };
}>();
userRouter.post("/signup", async (c) => {
  const body = await c.req.json();
  const {success}  = signupInput.safeParse(body);
  if(!success) {
    c.status(411);
    return c.json({error: "Invalid input"});
  }
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const user = await prisma.user.create({
      data: { email: body.email, password: body.password },
    });
    const token = await sign({ id: user.id }, secret);

    return c.json({
      jwt: token,
    });
  } catch (error) {
    console.log(error);
    c.status(411);
    return c.text("Invalid");
  }
});

userRouter.post("/signin", async (c) => {
  const body = await c.req.json();

  const {success}  = signInInput.safeParse(body);
  if(!success) {
    c.status(411);
    return c.json({error: "Invalid input"});
  }
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const user = await prisma.user.findFirst({
    where: {
      email: body.email,
      password: body.password,
    },
  });

  if (!user) {
    c.status(403);
    return c.json({ error: "wrong credentials" });
  }

  const jwt = await sign({ id: user.id }, secret);
  return c.json({ msg: "successfully signed in", jwt });
});
