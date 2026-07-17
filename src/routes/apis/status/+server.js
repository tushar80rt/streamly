import { json } from "@sveltejs/kit"
export function GET(){
    return json({"name": "hello"})
}

export function POST(){
    return json({"name":"Tushar"})
}


