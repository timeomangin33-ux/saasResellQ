import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request:Request) {
    try {

        const {title , content} = await request.json();

        if(!title || !content){ 
            return NextResponse.json({error: "Champss manquants."} , {status : 400})
        }

        const newNote = await prisma.note.create({
            data : {
                title , content,
            }
        });

        return NextResponse.json({message : "ok" , note : newNote} , {status : 201})
    
    
    }catch(error){
        return NextResponse.json({error: "Il y  a un problème."} , {status : 500});
    }
}