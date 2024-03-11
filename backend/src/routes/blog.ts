import  {PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { createBlogInput, updateBlogInput } from "@siddhant001/common";
import { Hono } from "hono";
import { verify } from "hono/jwt";
const secret = "mySecretKey";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
  };
  Variables: {
    userId: string;
  };
}>();

blogRouter.use("/*", async (c, next) => {
  const header = c.req.header("authorization") || "";
  const user = await verify(header, secret);
  if (user) {
    c.set("userId", user.id);
  } else {
    c.status(403);
    return c.json({ error: "You are not logged in" });
  }
  await next();
});
blogRouter.post("/", async (c) => {
  const body = await c.req.json();
  const {success}  = createBlogInput.safeParse(body);
  if(!success) {
    c.status(411);
    return c.json({error: "Invalid input"});
  }
  const authorId = c.get("userId"); // Convert authorId to a number
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.post.create({
    data: {
      title: body.title,
      content: body.content,
      authorId: Number(authorId),
    },
  });

  return c.json({
    id: blog.id,
  });
});

blogRouter.put("/", async (c) => {
  const body = await c.req.json();
  const {success}  = updateBlogInput.safeParse(body);
  if(!success) {
    c.status(411);
    return c.json({error: "Invalid input"});
  }
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blog = await prisma.post.update({
    where: { id: Number(body.id) },
    data: {
      title: body.title,
      content: body.content,
    },
  });

  return c.json({
    id: blog.id,
  });
});

blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const blogs = await prisma.post.findMany({});
  return c.json({
    blogs,
  });
});

blogRouter.get("/:id", async (c) => {
  const id = await c.req.param("id");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const blog = await prisma.post.findFirst({
      where: { id: Number(id) },
    });

    return c.json({
      blog,
    });
  } catch (error) {
    c.status(411);
    return c.json({
      message: "Error while fetching the post",
    });
  }
});
